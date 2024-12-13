const { createServer } = require('http');
const express = require("express");
const { Server } = require('socket.io');

const { readdirSync, statSync } = require("fs");
const { resolve, join, sep } = require("path");
const { homedir } = require('os');


const cookieParser = require('cookie-parser');
const SI = require('systeminformation');

const homeDir = homedir() + sep;
const app = express();
const server = createServer(app);
const io = new Server(server);

app.set('case sensitive routing', true);
app.set('view engine', 'ejs');
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.get('/', (req, res) => res.render(resolve('view', 'fs.ejs')));
app.use('/src', express.static(resolve('src')))
app.use('/D:', express.static('D:'));
app.use('/C:', express.static('C:'));

io.on('connect', (socket) => {
  socket.on('connected', async () => {
    let fsSize = await SI.fsSize()
    fsSize.forEach(d => {
      d.fs = d.fs + '/';
    })
    socket.emit('/data/disk', fsSize, homeDir)
  })

  socket.on(
    '/explore/path',
    /** @param {string} explorePath @param {()=>void} res  */
    (explorePath, res) => {

      let dirList = readdirSync(explorePath)
        .map(d => {
          let data = {};
          data.name = d;
          data.path = join(explorePath, d);

          try {
            data.stats = statSync(data.path);
            data.isDirectory = data.stats.isDirectory();
          } catch (e) {
            if (e.code === 'EBUSY' || e.code === 'ENOENT')
              data.ebusy = true;
            else
              return null;
          }

          return data;
        })
        .filter(d => d)
        .sort((d1, d2) => {
          if (d1.isDirectory && !d2.isDirectory) return -1;
          if (!d1.isDirectory && d2.isDirectory) return 1;
          return 0;
        });

      let folders = 0, files = 0;
      dirList.forEach(data => {
        if (data.isDirectory) folders++;
        else files++;
      })

      socket.emit('/data/breadcrumbPath', explorePath.split(sep).map((p, i, a) => {
        return { name: p, path: join(...a.slice(0, i + 1), '/') }
      }))

      res(dirList);

      dirList.forEach(data => {
        data.tittle = explorePath;
        data.total = dirList.length;
        data.folders = folders;
        data.files = files;
        socket.emit('/data/item', data);
      })
    })
})

server.listen(3000, e => {
  if (e) return console.trace(e);
  console.log('http://localhost:3000');
});
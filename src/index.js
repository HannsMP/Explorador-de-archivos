function formatBytes(bytes = 0) {
  let result = { parse: bytes, unit: 'B', value: bytes + ' B' };
  if (bytes >= 1024 ** 3) {
    result.parse = (bytes / (1024 ** 3));
    result.unit = 'GB';
    result.value = result.parse.toFixed(2) + ' GB';
  }
  else if (bytes >= 1024 ** 2) {
    result.parse = (bytes / (1024 ** 2));
    result.unit = 'MB';
    result.value = result.parse.toFixed(2) + ' MB';
  }
  else if (bytes >= 1024) {
    result.parse = (bytes / 1024);
    result.unit = 'KB';
    result.value = result.parse.toFixed(2) + ' KB';
  };

  return result;
}

/** @type {import('socket.io').Socket} */
const socket = io();

let connect = new Promise(res => {
  socket.on('connect', () => {
    socket.emit('connected');
    res();
  })
})

document.addEventListener('DOMContentLoaded', async () => {
  let currentPath = '';
  let currentSize = 0;

  let listViewBtn = document.getElementById("listViewBtn");
  let gridViewBtn = document.getElementById("gridViewBtn");

  let diskList = document.getElementById("disk-list");
  let pathList = document.getElementById("path-list");
  let filesBox = document.querySelector(".files-box");

  let breadcrumbPath = document.getElementById("breadcrumb-path");
  let infoPath = document.getElementById("info-path");
  let progressPath = document.getElementById("progress-path");

  let emit = {
    explorePath(path) {
      socket.emit(
        '/explore/path',
        path,
        () => {
          filesBox.innerHTML = '';
          currentPath = path;
        }
      )
    }
  }

  listViewBtn.addEventListener(
    "click",
    () => filesBox.classList.replace('view-grid', 'view-list')
  );

  gridViewBtn.addEventListener(
    "click",
    () => filesBox.classList.replace('view-list', 'view-grid')
  );

  await connect;

  socket.on(
    '/data/item',
    /** @param {{name:string, path:string, stats:import('fs').Stats, isDirectory:boolean, ebusy:boolean}} data */
    data => {
      if (data.tittle != currentPath) return;

      let div = document.createElement('div');
      div.classList.add('file-item');

      let html = '';

      if (data.isDirectory) {
        html += `<i class="bx bx-folder"></i>`;
        div.addEventListener('click', () => emit.explorePath(data.path))
      } else {
        html += `<i class="bx bx-file"></i>`;
        div.addEventListener('click', () => {
          const a = document.createElement('a');
          a.href = 'http://localhost:3000/' + data.path;
          a.target = '_blank';
          a.click();
        })
      }

      html += `<span class="file-name">${data.name}</span>`;

      if (!data.ebusy) {
        let chargeItem = data.stats.size / currentSize

        html += `<div class="file-progress" style="width: ${chargeItem * 100}%;"></div>`;

        html += `<span class="file-size">${formatBytes(data.stats.size).value}</span>`;
        html += `<span class="file-date">${data.stats.birthtimeMs}</span>`;
      }
      else
        div.classList.add('hide')

      div.innerHTML = html;
      filesBox.append(div);

      infoPath.innerText = `${data.folders} Carpetas, ${data.files} Archivos (${data.total})`;
      let charge = filesBox.querySelectorAll('.file-item').length / data.total
      progressPath.style.width = `${charge * 100}%`;
    }
  )

  socket.on(
    '/data/breadcrumbPath',
    /** @param {{name:string, path:string}[]} data  */
    data => {
      breadcrumbPath.innerHTML = '';

      data.forEach(d => {
        let anchor = document.createElement('a');
        anchor.addEventListener('click', () => emit.explorePath(d.path));
        anchor.innerText = d.name + '/';
        breadcrumbPath.append(anchor);
      })
    }
  )

  socket.on(
    '/data/disk',
    /** @param {import('systeminformation').Systeminformation.FsSizeData[]} data  */
    (data, homeDir) => {
      diskList.innerHTML = ''
      data.forEach((d, i) => {
        let li = document.createElement('li');
        li.classList.add('drive-item');

        let charge = (d.size - d.available) / d.size;

        li.innerHTML = `<i class="bx bx-hdd"></i> Disco ${d.mount} <br> (${(d.available / 1024 / 1024 / 1024).toFixed(2)} / ${(d.size / 1024 / 1024 / 1024).toFixed(2)} Gb)`
          + `<div class="drive-progress" style="width: ${charge * 100}%;"></div>`;

        li.addEventListener('click', () => {
          currentSize = d.size;
          emit.explorePath(d.fs)
        })

        diskList.append(li);

        if (i == 0) li.click();
      })

      pathList.querySelectorAll('li')
        .forEach(l => {
          l.addEventListener('click', () => emit.explorePath(homeDir + l.getAttribute('name')))
        })

    }
  )
})
import { BrowserWindow, net, app, ipcMain } from "electron";
import cheerio from "cheerio";
import fs from "fs";

let mainWin: BrowserWindow = null;

function httpRequest(options: string | Electron.ClientRequestConstructorOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = net.request(options);
    let buffer = Buffer.from('');
    r.on("response", (res) => {
      if (res.statusCode !== 200) {
        reject("服务器出小差啦！");
      }
      res.on("data", (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);
      });
      res.on("end", () => {
        resolve(buffer.toString());
      })
      res.on("error", () => {
        reject("获取数据失败！")
      })
    });
    r.on("error", (error) => {
      console.error(error);
      reject("获取数据失败！")
    } )
    // 执行
    r.end();
  });
}

function success(data: any) {
  return {
    status: 'success',
    data
  }
}

function fail(error: Error) {
  return {
    status: 'fail',
    msg: error.message || '获取失败失败'
  }
}

// 搜索
async function search(searchText: string) {
  try {
    const result = await httpRequest(`https://www.gequbao.com/s/${searchText}`)
    const list = [];
    const $ = cheerio.load(result);
    $('div.card-text .row').slice(1).map((_, row) => {
      const divs = $(row).find('div');
      const a = $(divs[0]).find('a');
      const href = a.attr('href');
      const id = href.split('/').pop().trim();
      const name= a.text().trim();
      const author = $(divs[1]).text().trim();
      list.push({
        id,
        name,
        author
      })
    })
    return success(list);
  } catch (error) {
    return fail(error);
  }
}

// 获取链接
async function getUrl(id: string) {
  try {
    const result = await httpRequest(`https://www.gequbao.com/api/play_url?id=${id}&json=1
    `)
    const data = JSON.parse(result);
    const url = data.data.url;
    return success({
      id,
      url
    });
  } catch (error) {
    console.error(`获取链接失败`, error);
    return fail(error);
  }
}

function getWangYiYunUrl(url: string) {
  return new Promise((resolve) => {
    net.fetch(url).then(res => {
      const location = res.headers.get('location');
      console.log(location);
      resolve(location);
    }).catch(() => {
      resolve(null);
    })
  })
}

// 下载
async function download(id, path, url) {
  const file = fs.createWriteStream(path);
  let totalSize = 0;

  const request = net.request(url);

  request.on('response', (response) => {
    const statusCode = response.statusCode;

    // 如果响应是重定向
    if (statusCode === 302) {
      const redirectUrl = response.headers.location;
      if (!redirectUrl) {
        console.error('Redirect location is missing');
        return;
      }
      // 关闭当前请求
      request.abort();
      // 发送新的请求到重定向后的位置
      download(id, path, redirectUrl);
      return;
    }

    // 获取文件大小
    const contentLength = response.headers['content-length'];
    totalSize = parseInt(contentLength as string, 10);

    response.on('data', (chunk) => {
      file.write(chunk);
      const downloadedSize = file.bytesWritten;
      const progress = (downloadedSize / totalSize) * 100;
      mainWin.webContents.send("download-progress", {
        id,
        progress: progress.toFixed(0)
      })
      console.log(`Downloaded ${downloadedSize} bytes (${progress.toFixed(0)}%)`);
    });

    response.on('end', () => {
      file.end();
      mainWin.webContents.send("download-progress", {
        id,
        progress: 100
      })
      console.log('Download completed');
    });

    response.on('error', (err) => {
      console.error('Download failed:', err);
    });
  });

  request.on('error', (err) => {
    console.error('Request failed:', err);
  });

  request.end();
}

async function main(args: any, win: BrowserWindow) {
  mainWin = win;
  const { name, ...options } = args;
  if (!name) {
    console.error('args name is null')
    return;
  }
  try {
    let result;
    switch(name) {
      case 'search': result = await search(options.searchText); break;
      case 'getUrl': result = await getUrl(options.id); break;
      case 'download': download(options.id, options.path, options.url); break;
      default:
        console.error('api is null');
    }
    win.webContents.send("response", {
      name,
      data: result
    });
  } catch (error) {
    console.error("api error:", error);
  }
}

export default main;
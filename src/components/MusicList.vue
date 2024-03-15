<template>
  <div class="songs">
    <n-data-table :bordered="false" :columns="columns" :data="songList" />
  </div>
</template>

<script setup lang="ts">
import { h, onMounted, ref, watchEffect } from 'vue';
import { Music } from './Index.vue';
import { NButton, useMessage } from 'naive-ui';
import { useSetting } from '../hooks/settings';
const props = defineProps({
  list: {
    type: Array<Music>,
  },
})

const columns = [
  {
    title: '歌名',
    key: 'name'
  },
  {
    title: '歌手',
    key: 'author'
  },
  {
    title: '播放',
    key: 'play',
    width: 100,
    render(row: any) {
      return h(
        NButton,
        {
          size: 'small',
          type: row.id === playingId.value ? 'primary' : 'default',
          onClick: () => play(row)
        },
        { default: () => row.id === playingId.value ? '暂停' : '播放' }
      )
    }
  },
  {
    title: '下载',
    key: 'actions',
    width: 100,
    render(row: any) {
      return h(
        NButton,
        {
          size: 'small',
          type: row.downloadProgress == 100 ? 'primary' : 'default',
          onClick: () => download(row)
        },
        { default: () => row.downloadProgress ? `${row.downloadProgress == 100 ? '已完成' : row.downloadProgress + '%'}` : '下载' }
      )
    }
  }
]

const msg = useMessage();
const playingId = ref("");
const songList = ref<Music[]>();
const downloading = ref(false);
const { getSetting } = useSetting();
const audio = ref<HTMLAudioElement | null>(null);

watchEffect(() => {
  songList.value = props.list;
})

onMounted(() => {
  window.ipcRenderer.on('response', (_, res) => {
    if (res.name !== 'getUrl') return;
    msg.destroyAll();
    if (res.data.status === 'fail') {
      msg.error('播放失败');
      return;
    }
    const { id, url } = res.data.data;
    let music;
    songList.value = songList.value?.map(item => {
      if (item.id === id) {
        item.url = url;
        music = item;
      }
      return item;
    })
    if (downloading.value) {
      // 下载
      downloadMusic(music);
      downloading.value = false;
      return;
    }
    playMusic(id, url);
  })
  window.ipcRenderer.on('download-progress', (_, args) => {
    const {id, progress} = args;
    songList.value = songList.value?.map(item => {
      if (item.id === id) {
        item.downloadProgress = progress;
      }
      return item;
    })
  })
})

const play = (row: any) => {
  console.log(playingId.value, row);
  if (playingId.value && audio.value) {
    audio.value.pause();
    audio.value = null;
  }
  if (playingId.value === row.id) {
    playingId.value = "";
    return;
  }
  if (!row.url) {
    msg.loading('加载中', {duration: 0});
    window.ipcRenderer.invoke('api', {
      name: 'getUrl',
      id: row.id
    })
  } else {
    playMusic(row.id, row.url);
  }
}

const download = (row: any) => {
  if (!row.url) {
    msg.loading('加载中', {duration: 0});
    window.ipcRenderer.invoke('api', {
      name: 'getUrl',
      id: row.id
    })
    downloading.value = true;
  } else {
    // 下载
    downloadMusic(row);
  }
}

const playMusic = (id: string, url: string) => {
  audio.value = new Audio(url);
  audio.value.play();
  playingId.value = id;
}

const downloadMusic = (music?: Music) => {
  if (!music) return;
  const folder = getSetting('downloadFolder');
  if (!folder) {
    msg.warning("请先设置下载保存路径");
    return;
  }
  if (music.downloadProgress == 100) {
    window.ipcRenderer.invoke('open-folder', folder);
    return;
  }
  if (music.downloadProgress) {
    return;
  }
  window.ipcRenderer.invoke('api', {
    name: 'download',
    id: music.id,
    path: `${folder}/${music.name} - ${music.author}.mp3`,
    url: music.url
  })
}
</script>

<style scoped></style>
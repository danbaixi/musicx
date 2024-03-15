<template>
  <div class="search">
    <div class="header">
      <n-input v-model:value="searchText" @keyup="handleKeyUp" placeholder="请输入搜索内容" autofocus clearable></n-input>
      <n-button @click="search" type="primary" style="margin-left:16px;width: 80px">搜索</n-button>
      <n-button @click="openDir" style="margin-left:16px">下载目录</n-button>
      <n-button @click="showSetting = !showSetting" style="margin-left:16px">设置</n-button>
    </div>
    <div class="result">
      <MusicList v-if="!firstSearch" :list="list" />
    </div>
    <n-modal v-model:show="showSetting">
      <n-card style="width: 80%; height: 400px;" title="设置" :bordered="false" size="huge" role="dialog"
        aria-modal="true">
        <n-form :label-width="80" :model="settings">
          <n-form-item label="下载保存路径" path="setting.downloadFolder">
            <n-input v-model:value="settings.downloadFolder" placeholder="请选择下载保存路径" />
            <n-button @click="selectDownloadFolder" type="primary" style="margin-left: 15px">选择</n-button>
          </n-form-item>
        </n-form>
      </n-card>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useMessage, NForm, NFormItem, NButton } from 'naive-ui'
import MusicList from './MusicList.vue';
import { useSetting } from '../hooks/settings';

export interface Music {
  id: string;
  name: string;
  author?: string;
  url?: string;
  downloadProgress?: number;
}

const msg = useMessage();

const searchText = ref("");
const firstSearch = ref(true);
const list = ref<Music[]>([]);
const showSetting = ref(false);

const { settings } = useSetting();

onMounted(() => {
  window.ipcRenderer.on("response", (_, res) => {
    if (res.name !== 'search') return;
    msg.destroyAll();
    if (res.data.status === 'fail') {
      msg.error('搜索失败');
      return;
    }
    if (firstSearch.value) {
      firstSearch.value = false;
    }
    list.value = res.data.data;
    console.log(res);
  })
})

const search = () => {
  if (!searchText.value) {
    msg.warning("请输入搜索内容");
    return;
  }
  window.ipcRenderer.invoke('api', {
    name: 'search',
    searchText: searchText.value
  })
  msg.loading('搜索中', { duration: 0 });
}

const handleKeyUp = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    search();
  }
}

const openDir = () => {
  if (!settings.value.downloadFolder) {
    msg.warning("请先设置下载保存路径");
    return;
  }
  window.ipcRenderer.invoke('open-folder', settings.value.downloadFolder);
}

const selectDownloadFolder = () => {
  window.ipcRenderer.invoke('open-folder-dialog');
  window.ipcRenderer.on('folder-path', (_, path) => {
    settings.value.downloadFolder = path;
  })
}

</script>

<style scoped>
.search {
  width: 100%;
  padding: 20px;
}

.header {
  display: flex;
}

.result {
  margin-top: 20px;
}
</style>
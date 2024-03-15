import { watch } from "vue";
import { onMounted, ref } from "vue";

export interface Setting {
  downloadFolder?: string;
  [key: string]: any;
}

export function useSetting() {
  const SETTING_CACHE_KEY = "settings"
  const settings = ref<Setting>({});

  onMounted(() => {
    const cache = localStorage.getItem(SETTING_CACHE_KEY);
    if (cache) {
      settings.value = JSON.parse(cache);
    }
  })

  watch(settings, () => {
    localStorage.setItem(SETTING_CACHE_KEY, JSON.stringify(settings.value));
  }, {
    deep: true
  })
  
  const getSetting = (key: string) => {
    if (!settings.value) {
      return null;
    }
    const cache = localStorage.getItem(SETTING_CACHE_KEY);
    if (!cache) {
      return null;
    }
    const list = JSON.parse(cache);
    if (key) {
      return list[key];
    }
    return list;
  }

  return {
    settings,
    getSetting
  }
}
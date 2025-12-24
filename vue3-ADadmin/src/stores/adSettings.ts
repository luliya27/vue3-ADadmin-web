// src/stores/adSettings.ts
import { defineStore } from 'pinia'
import type { AdSettings } from '@/services/adadmin'
import { fetchAdSettings } from '@/services/adadmin'

export const useAdSettingsStore = defineStore('adSettings', {
  state: () => ({
    settings: null as AdSettings | null,
    loading: false,
    loaded: false,
  }),
  getters: {
    companyname: (state) => state.settings?.companyname || 'XXX公司',
    teamname: (state) => state.settings?.teamname || '資訊單位',
    logoUrl: (state) => state.settings?.syslogo || '',
    backgroundUrl: (state) => state.settings?.sysbackgroundimg || '',
  },
  actions: {
    async init() {
      if (this.loaded || this.loading) return
      this.loading = true
      try {
        this.settings = await fetchAdSettings()
        this.loaded = true
      } finally {
        this.loading = false
      }
    },
    // 給設定頁儲存後更新用
    setSettings(payload: AdSettings) {
      this.settings = payload
      this.loaded = true
    },
  },
})

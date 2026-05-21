<template>
  <router-view v-slot="{ Component, route }">
    <transition :name="(route.meta.transition as string) || 'fade'" mode="out-in">
      <component :is="Component" :key="route.path" />
    </transition>
  </router-view>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDataStore } from './stores/dataStore'
import { installWatchdog } from './plugins/watchdog'

const router = useRouter()
const dataStore = useDataStore()

onMounted(async () => {
  await dataStore.loadData()
  installWatchdog(router)
})
</script>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>

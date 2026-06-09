<template>
  <div id="scale-root">
    <router-view v-slot="{ Component, route }">
      <transition :name="(route.meta.transition as string) || 'fade'" mode="out-in">
        <component :is="Component" :key="route.path" />
      </transition>
    </router-view>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDataStore } from './stores/dataStore'
import { installWatchdog } from './plugins/watchdog'
import { useTrial } from './composables/useTrial'
import { useResponsiveScale } from './composables/useResponsiveScale'

const router = useRouter()
const dataStore = useDataStore()

useResponsiveScale()

onMounted(async () => {
  const { checkTrial } = useTrial()
  const expired = await checkTrial()
  if (expired) {
    router.push('/trial-expired')
    return
  }
  await dataStore.loadData()
  installWatchdog(router)
})
</script>

<style>
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #000;
}

#scale-root {
  width: 1670px;
  height: 940px;
  transform-origin: top left;
  position: absolute;
  top: 0;
  left: 0;
}
</style>

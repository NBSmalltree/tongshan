import { createRouter, createWebHashHistory } from 'vue-router'
import { useTrial } from '../composables/useTrial'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'Welcome',
      component: () => import('../views/Welcome.vue')
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: () => import('../views/Dashboard.vue')
    },
    {
      path: '/theme/:themeName',
      name: 'ThemeList',
      component: () => import('../views/ThemeList.vue')
    },
    {
      path: '/detail/:id',
      name: 'Detail',
      component: () => import('../views/Detail.vue')
    },
    {
      path: '/search',
      name: 'Search',
      component: () => import('../views/SearchView.vue')
    },
    {
      path: '/trial-expired',
      name: 'TrialExpired',
      component: () => import('../views/TrialExpired.vue'),
      meta: { trialExempt: true }
    }
  ]
})

router.beforeEach(async (to, _from, next) => {
  if (to.meta.trialExempt) {
    next()
    return
  }

  const { trialExpired, getTrialStatus } = useTrial()
  if (trialExpired.value === null) {
    await getTrialStatus()
  }

  if (trialExpired.value === true) {
    next('/trial-expired')
  } else {
    next()
  }
})

export default router

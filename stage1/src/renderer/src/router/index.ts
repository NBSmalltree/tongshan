import { createRouter, createWebHashHistory } from 'vue-router'

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
    }
  ]
})

export default router

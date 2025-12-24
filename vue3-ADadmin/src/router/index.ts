// src/router/index.ts
// 路由設定檔
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import LoginView from '@/views/auth/LoginView.vue'
import AppLayout from '@/components/layouts/AppLayout.vue'
import DashboardView from '@/views/dashboard/DashboardView.vue'
import UserListView from '@/views/users/UserListView.vue'
import GroupListView from '@/views/groups/GroupListView.vue'
import OuTreeView from '@/views/ous/OuTreeView.vue'
import ComputerListView from '@/views/computers/ComputerListView.vue'
import SettingsAdView from '@/views/settings/SettingsAdView.vue'

// 定義路由
const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { public: true }, // 不需要登入即可進入
  },
  // 需要登入後才能進入的區域
  {
    path: '/',
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      // 儀表板首頁
      {
        path: '',
        redirect: { name: 'Dashboard' },
      },
      // 儀表板
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: DashboardView,
      },
      // 使用者管理
      {
        path: 'users',
        name: 'UserList',
        component: UserListView,
      },
      // 群組管理
      {
        path: 'groups',
        name: 'GroupList',
        component: GroupListView,
      },
      // 組織單位管理
      {
        path: 'ous',
        name: 'OuTree',
        component: OuTreeView,
      },
      // 電腦管理
      {
        path: 'computers',
        name: 'ComputerList',
        component: ComputerListView, 
      },    
      // AD系統設定
      {
        path: 'settings/ad',
        name: 'SettingsAd',
        component: SettingsAdView,
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to, _from, next) => {
  const isLoggedIn = !!localStorage.getItem('adadmin_token')

  if (to.meta.requiresAuth && !isLoggedIn) {
    next({ name: 'Login' })
  } else if (to.name === 'Login' && isLoggedIn) {
    next({ name: 'Dashboard' })
  } else {
    next()
  }
})

export default router

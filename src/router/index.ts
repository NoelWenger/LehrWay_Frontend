import { createRouter, createWebHistory } from 'vue-router'

import loginpage from '@/pages/loginpage.vue'
import registerpage from '@/pages/registerpage.vue'
import homepage from '@/pages/homepage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path:'/',
      name:'login',
      component: loginpage
    },
    {
      path:'/register',
      name:'register',
      component: registerpage
    },
    {
      path:'/home',
      name:'home',
      component: homepage
    },
  ],
})

export default router

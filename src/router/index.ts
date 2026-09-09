import { createRouter, createWebHistory } from 'vue-router'

import loginpage from '@/pages/loginpage.vue'
import registerpage from '@/pages/registerpage.vue'

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
  ],
})

export default router

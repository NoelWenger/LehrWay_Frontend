import {
  createRouter,
  createWebHistory,
} from 'vue-router'

import loginpage from '@/pages/loginpage.vue'
import registerpage from '@/pages/registerpage.vue'
import homepage from '@/pages/homepage.vue'
import lehrgangpage from '@/pages/lehrgangpage.vue'
import logpage from '@/pages/logpage.vue'

import {
  loadCurrentUser,
} from '@/services/auth'

const router = createRouter({
  history: createWebHistory(
    import.meta.env.BASE_URL,
  ),

  routes: [
    {
      path: '/',
      name: 'login',
      component: loginpage,
    },
    {
      path: '/register',
      name: 'register',
      component: registerpage,
    },
    {
      path: '/home',
      name: 'home',
      component: homepage,
    },
    {
      path: '/lehrgang',
      name: 'lehrgang',
      component: lehrgangpage,
    },
    {
      path: '/logs',
      name: 'logs',
      component: logpage,
    },
  ],
})

router.beforeEach(async to => {
  if (
    to.path === '/' ||
    to.path === '/register'
  ) {
    return
  }

  const user = await loadCurrentUser()

  if (!user) {
    return {
      path: '/',
      query: {
        reason: 'session',
      },
    }
  }
})

export default router

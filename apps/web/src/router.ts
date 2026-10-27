import { createRouter, createWebHistory } from 'vue-router'
import { useSession } from './session'
import AdminReviewsView from './views/AdminReviewsView.vue'
import AdminZonesView from './views/AdminZonesView.vue'
import BranchEditorView from './views/BranchEditorView.vue'
import HomeView from './views/HomeView.vue'
import LoginView from './views/LoginView.vue'
import PanelView from './views/PanelView.vue'
import PhoneView from './views/PhoneView.vue'
import PublicBranchView from './views/PublicBranchView.vue'
import RegisterView from './views/RegisterView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomeView },
    { path: '/entrar', component: LoginView },
    { path: '/registro', component: RegisterView },
    { path: '/verificar-telefono', component: PhoneView },
    { path: '/panel', component: PanelView },
    { path: '/panel/sucursales/nueva', component: BranchEditorView },
    { path: '/panel/sucursales/:id', component: BranchEditorView },
    { path: '/admin/zonas', component: AdminZonesView },
    { path: '/admin/revisiones', component: AdminReviewsView },
    { path: '/sucursales/:id', component: PublicBranchView },
  ],
})

router.beforeEach(async (to) => {
  const { currentUser, refresh } = useSession()
  if (currentUser.value === undefined) {
    await refresh()
  }
  const needsAccount = to.path.startsWith('/panel') || to.path.startsWith('/admin') || to.path === '/verificar-telefono'
  if (needsAccount && !currentUser.value) {
    return '/entrar'
  }
  if ((to.path === '/entrar' || to.path === '/registro') && currentUser.value) {
    return '/panel'
  }
  return true
})

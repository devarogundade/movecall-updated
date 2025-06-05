import { createRouter, createWebHistory } from "vue-router";
import RestakeView from "../views/RestakeView.vue";
import OperatorView from "../views/OperatorView.vue";
import ServiceView from "../views/ServiceView.vue";
import StakeView from "@/views/restake/StakeView.vue";
import UnStakeView from "@/views/restake/UnStakeView.vue";
import DelegateView from "@/views/operator/DelegateView.vue";
import ServiceInfoView from "@/views/service/ServiceInfoView.vue";
import AIView from "@/views/AIView.vue";
import RewardsView from "@/views/RewardsView.vue";
import WithdrawsView from "@/views/WithdrawsView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  },
  routes: [
    {
      path: "/",
      name: "restake",
      component: RestakeView,
    },
    {
      path: "/operator",
      name: "operator",
      component: OperatorView,
    },
    {
      path: "/service",
      name: "service",
      component: ServiceView,
    },
    {
      path: "/restake/:id",
      name: "restake-stake",
      component: StakeView,
    },
    {
      path: "/restake/:id/unstake",
      name: "restake-unstake",
      component: UnStakeView,
    },
    {
      path: "/operator/:id",
      name: "operator-delegate",
      component: DelegateView,
    },
    {
      path: "/service/:id",
      name: "service-id",
      component: ServiceInfoView,
    },
    {
      path: "/ai",
      name: "ai",
      component: AIView,
    },
    {
      path: "/rewards",
      name: "rewards",
      component: RewardsView,
    },
    {
      path: "/withdraws",
      name: "withdraws",
      component: WithdrawsView,
    },
  ],
});

export default router;

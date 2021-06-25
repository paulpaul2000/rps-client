import Vue from 'vue'
import App from './App.vue'
import router from '@/router'
import VueSocketIO from 'vue-socket.io'
import SocketIO from 'socket.io-client'
import store from '@/store'

let url = `${window.location.protocol}//${window.location.hostname}:8081`

if (process.env.VUE_APP_API_URL) {
  url = process.env.VUE_APP_API_URL
}

const io = SocketIO(url, {})
store.socket = io

if (store.state.user != null) {
  store.dispatch('login', store.state.user.username)
}

const vueSocket = new VueSocketIO({
  debug: false,
  connection: io,
  vuex: {
    store,
    actionPrefix: "socket_"
  }  
})

Vue.use(vueSocket)

Vue.config.productionTip = false

new Vue({
  router,
  store: store,
  render: h => h(App),
}).$mount('#app')

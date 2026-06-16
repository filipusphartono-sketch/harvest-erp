<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { auth } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'

const isInitialized = ref(false)

onMounted(() => {
  // Wait for the first auth state emission to ensure we know if user is logged in
  const unsubscribe = onAuthStateChanged(auth, () => {
    isInitialized.value = true
    unsubscribe() // Only need this once on initial load
  })
})
</script>

<template>
  <!-- Beautiful Premium Loader matching dark slate dashboard theme -->
  <div v-if="!isInitialized" class="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200">
    <div class="flex flex-col items-center gap-4">
      <div class="h-10 w-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-sm font-medium tracking-wider text-slate-400 uppercase">Memuat Aplikasi...</p>
    </div>
  </div>
  <router-view v-else />
</template>

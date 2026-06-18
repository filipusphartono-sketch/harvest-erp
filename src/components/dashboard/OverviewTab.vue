<script setup lang="ts">
interface StatItem {
  name: string
  value: string
  change: string
  changeType: string
}

interface ActivityItem {
  id: string
  text: string
  time: string
  type: 'info' | 'success' | 'warning' | 'error'
}

defineProps<{
  stats: StatItem[]
  activities: ActivityItem[]
}>()
</script>

<template>
  <div class="space-y-8">
    <!-- Stats cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div
        v-for="stat in stats"
        :key="stat.name"
        class="bg-slate-900/50 border border-slate-800/60 p-6 rounded-2xl shadow-sm hover:border-slate-700 transition-all duration-300"
      >
        <p class="text-sm text-slate-400 font-medium">{{ stat.name }}</p>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-2xl font-bold text-white">{{ stat.value }}</span>
          <span class="text-xs font-semibold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
            {{ stat.change }}
          </span>
        </div>
      </div>
    </div>

    <!-- Placeholder Section for ERP modules -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Main Chart Area (placeholder) -->
      <div class="lg:col-span-2 bg-slate-900/40 border border-slate-800/60 p-6 rounded-2xl">
        <h2 class="text-lg font-semibold text-white mb-4">Grafik Penjualan Bulanan</h2>
        <div class="h-64 bg-slate-950/80 rounded-xl flex items-center justify-center text-slate-500 border border-slate-800/50">
          [ Visualisasi Grafik Penjualan ]
        </div>
      </div>

      <!-- Activity log -->
      <div class="bg-slate-900/40 border border-slate-800/60 p-6 rounded-2xl">
        <h2 class="text-lg font-semibold text-white mb-4">Aktivitas Terakhir</h2>
        <div v-if="activities.length > 0" class="space-y-4">
          <div 
            v-for="activity in activities" 
            :key="activity.id"
            class="flex items-start gap-3 text-sm"
          >
            <span 
              class="h-2 w-2 rounded-full mt-1.5 shrink-0"
              :class="{
                'bg-blue-500': activity.type === 'info',
                'bg-green-500': activity.type === 'success',
                'bg-yellow-500': activity.type === 'warning',
                'bg-red-500': activity.type === 'error'
              }"
            ></span>
            <div>
              <p class="text-slate-200 font-medium">{{ activity.text }}</p>
              <p class="text-xs text-slate-400">{{ activity.time }}</p>
            </div>
          </div>
        </div>
        <div v-else class="h-64 flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-950/20">
          <svg class="h-8 w-8 mb-2 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-xs">Belum ada aktivitas</span>
        </div>
      </div>
    </div>
  </div>
</template>

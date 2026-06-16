<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { auth, db } from '../firebase'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

const fullName = ref('')
const email = ref('')
const phoneNumber = ref('')
const address = ref('')
const password = ref('')
const confirmPassword = ref('')

const isRegister = ref(false)
const isForgotPassword = ref(false)

const showPassword = ref(false)
const showConfirmPassword = ref(false)

const error = ref('')
const successMessage = ref('')
const loading = ref(false)
const router = useRouter()

// Auto redirect if already logged in
onMounted(() => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      router.push('/dashboard')
    }
  })
})

const showLoginMode = () => {
  isRegister.value = false
  isForgotPassword.value = false
  error.value = ''
  successMessage.value = ''
  fullName.value = ''
  email.value = ''
  phoneNumber.value = ''
  address.value = ''
  password.value = ''
  confirmPassword.value = ''
  showPassword.value = false
  showConfirmPassword.value = false
}

const showRegisterMode = () => {
  isRegister.value = true
  isForgotPassword.value = false
  error.value = ''
  successMessage.value = ''
  fullName.value = ''
  email.value = ''
  phoneNumber.value = ''
  address.value = ''
  password.value = ''
  confirmPassword.value = ''
  showPassword.value = false
  showConfirmPassword.value = false
}

const showForgotPasswordMode = () => {
  isRegister.value = false
  isForgotPassword.value = true
  error.value = ''
  successMessage.value = ''
  fullName.value = ''
  email.value = ''
  phoneNumber.value = ''
  address.value = ''
  password.value = ''
  confirmPassword.value = ''
  showPassword.value = false
  showConfirmPassword.value = false
}

const handleSubmit = async () => {
  loading.value = true
  error.value = ''
  successMessage.value = ''

  if (isRegister.value) {
    if (!fullName.value.trim()) {
      error.value = 'Nama lengkap wajib diisi.'
      loading.value = false
      return
    }
    if (password.value !== confirmPassword.value) {
      error.value = 'Konfirmasi kata sandi tidak cocok.'
      loading.value = false
      return
    }
  }

  try {
    if (isForgotPassword.value) {
      if (!email.value) {
        error.value = 'Email konfirmasi wajib diisi.'
        loading.value = false
        return
      }
      await sendPasswordResetEmail(auth, email.value)
      successMessage.value = 'Tautan untuk mereset kata sandi telah dikirim ke email Anda! Mengalihkan ke login...'
      setTimeout(() => {
        showLoginMode()
      }, 2500)
    } else if (isRegister.value) {
      const userCredential = await createUserWithEmailAndPassword(auth, email.value, password.value)
      
      if (userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: fullName.value
        })
        
        // Save user to Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          fullName: fullName.value,
          email: email.value,
          phoneNumber: phoneNumber.value,
          address: address.value,
          role: 'Karyawan',
          status: 'Aktif',
          createdAt: serverTimestamp()
        })
      }

      await signOut(auth)

      successMessage.value = 'Pendaftaran berhasil! Silakan masuk menggunakan akun baru Anda.'
      
      setTimeout(() => {
        showLoginMode()
      }, 2000)
    } else {
      await signInWithEmailAndPassword(auth, email.value, password.value)
      successMessage.value = 'Berhasil masuk! Mengalihkan...'
      setTimeout(() => {
        router.push('/dashboard')
      }, 1000)
    }
  } catch (err: any) {
    console.error(err)
    if (err.code === 'auth/email-already-in-use') {
      error.value = 'Email sudah terdaftar.'
    } else if (err.code === 'auth/weak-password') {
      error.value = 'Kata sandi minimal 6 karakter.'
    } else if (err.code === 'auth/invalid-email') {
      error.value = 'Format email tidak valid.'
    } else if (err.code === 'auth/invalid-credential') {
      error.value = 'Email atau kata sandi salah.'
    } else if (err.code === 'auth/user-not-found') {
      error.value = 'Email tidak ditemukan.'
    } else {
      error.value = err.message || 'Terjadi kesalahan. Silakan coba lagi.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
    <!-- Background glow/gradient shapes -->
    <div class="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

    <div class="sm:mx-auto sm:w-full sm:max-w-md z-10 flex flex-col items-center">
      <h2 class="mt-6 text-center text-3xl font-extrabold tracking-widest text-white leading-none">
        HARVEST
      </h2>
      <span class="text-[9px] font-medium text-slate-400 tracking-widest mt-1.5 uppercase">Enterprise Resource Planning</span>
      <p class="mt-4 text-center text-sm text-slate-400">
        <template v-if="isForgotPassword">
          Reset kata sandi akun Anda
        </template>
        <template v-else-if="isRegister">
          Daftar akun baru untuk mulai mengelola operasional
        </template>
        <template v-else>
          Masuk untuk mengelola operasional Anda
        </template>
      </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
      <div class="bg-slate-900/60 backdrop-blur-xl py-8 px-4 border border-slate-800/80 shadow-2xl rounded-2xl sm:px-10">
        <form class="space-y-6" @submit.prevent="handleSubmit">
          <!-- Full Name (Register Mode only) -->
          <div v-if="isRegister" class="space-y-4">
            <div>
              <label for="fullName" class="block text-sm font-medium text-slate-300">
                Nama Lengkap
              </label>
              <div class="mt-1">
                <input
                  id="fullName"
                  v-model="fullName"
                  type="text"
                  required
                  class="appearance-none block w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all sm:text-sm"
                  placeholder="Nama Lengkap Anda"
                />
              </div>
            </div>
            
            <div>
              <label for="phoneNumber" class="block text-sm font-medium text-slate-300">
                No Telepon
              </label>
              <div class="mt-1">
                <input
                  id="phoneNumber"
                  v-model="phoneNumber"
                  type="tel"
                  required
                  class="appearance-none block w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all sm:text-sm"
                  placeholder="Contoh: 08123456789"
                />
              </div>
            </div>

            <div>
              <label for="address" class="block text-sm font-medium text-slate-300">
                Alamat
              </label>
              <div class="mt-1">
                <input
                  id="address"
                  v-model="address"
                  type="text"
                  required
                  class="appearance-none block w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all sm:text-sm"
                  placeholder="Alamat Lengkap Anda"
                />
              </div>
            </div>
          </div>

          <!-- Email (All modes) -->
          <div>
            <label for="email" class="block text-sm font-medium text-slate-300">
              {{ isForgotPassword ? 'Email Konfirmasi' : 'Alamat Email' }}
            </label>
            <div class="mt-1">
              <input
                id="email"
                v-model="email"
                type="email"
                required
                class="appearance-none block w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all sm:text-sm"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <!-- Password (Login & Register Mode only) -->
          <div v-if="!isForgotPassword">
            <div class="flex items-center justify-between">
              <label for="password" class="block text-sm font-medium text-slate-300">
                Kata Sandi
              </label>
              <!-- Lupa Password Link (Login Mode only) -->
              <div v-if="!isRegister" class="text-sm">
                <button
                  type="button"
                  @click="showForgotPasswordMode"
                  class="font-medium text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
                >
                  Lupa password?
                </button>
              </div>
            </div>
            <div class="mt-1 relative rounded-md shadow-sm">
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                class="appearance-none block w-full pl-3 pr-10 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all sm:text-sm"
                placeholder="••••••••"
              />
              <!-- Toggle Visibility Button -->
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors focus:outline-none cursor-pointer"
              >
                <!-- Eye Icon -->
                <svg v-if="!showPassword" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <!-- Eye Off Icon -->
                <svg v-else class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.025 10.025 0 014.132-5.4M9.62 9.62a3 3 0 004.14 4.14M15 12a3 3 0 11-6 0 3 3 0 016 0zm-3-7a9.963 9.963 0 014.2 1.05M21.542 12c-1.274 4.057-5.064 7-9.542 7-1.077 0-2.112-.17-3.085-.485M3 3l18 18" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Confirm Password (Register Mode only) -->
          <div v-if="isRegister">
            <label for="confirm-password" class="block text-sm font-medium text-slate-300">
              Konfirmasi Kata Sandi
            </label>
            <div class="mt-1 relative rounded-md shadow-sm">
              <input
                id="confirm-password"
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                required
                class="appearance-none block w-full pl-3 pr-10 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all sm:text-sm"
                placeholder="••••••••"
              />
              <!-- Toggle Visibility Button -->
              <button
                type="button"
                @click="showConfirmPassword = !showConfirmPassword"
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors focus:outline-none cursor-pointer"
              >
                <!-- Eye Icon -->
                <svg v-if="!showConfirmPassword" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <!-- Eye Off Icon -->
                <svg v-else class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.025 10.025 0 014.132-5.4M9.62 9.62a3 3 0 004.14 4.14M15 12a3 3 0 11-6 0 3 3 0 016 0zm-3-7a9.963 9.963 0 014.2 1.05M21.542 12c-1.274 4.057-5.064 7-9.542 7-1.077 0-2.112-.17-3.085-.485M3 3l18 18" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Alert Messages -->
          <div v-if="error" class="text-red-400 text-sm bg-red-950/40 border border-red-900/50 rounded-lg p-3">
            {{ error }}
          </div>

          <div v-if="successMessage" class="text-green-400 text-sm bg-green-950/40 border border-green-900/50 rounded-lg p-3">
            {{ successMessage }}
          </div>

          <!-- Action Button -->
          <div>
            <button
              type="submit"
              :disabled="loading"
              class="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-purple-500 transition-all cursor-pointer disabled:opacity-50"
            >
              <template v-if="loading">Memproses...</template>
              <template v-else-if="isForgotPassword">Kirim Link Reset</template>
              <template v-else-if="isRegister">Simpan</template>
              <template v-else>Masuk</template>
            </button>
          </div>
        </form>

        <!-- Mode Toggles / Bottom Navigation Links -->
        <div class="mt-6 border-t border-slate-800 pt-6 text-center">
          <button
            v-if="isForgotPassword"
            @click="showLoginMode"
            class="text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
          >
            Kembali ke Login
          </button>
          <button
            v-else
            @click="isRegister ? showLoginMode() : showRegisterMode()"
            class="text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
          >
            {{ isRegister ? 'Sudah punya akun? Masuk di sini' : 'Belum punya akun? Daftar sekarang' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

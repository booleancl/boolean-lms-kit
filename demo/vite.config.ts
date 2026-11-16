import { defineConfig } from 'vite'
import RubyPlugin from 'vite-plugin-ruby'
import lmsKit from '@boolean/lms-kit/vite'

export default defineConfig({
  plugins: [
    RubyPlugin(),
    lmsKit(),
  ],
})

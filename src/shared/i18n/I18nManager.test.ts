// Test file - Verifica que el sistema de i18n funciona correctamente
// Para ejecutar: npx ts-node src/shared/i18n/I18nManager.test.ts

import { I18nManager, Language } from './I18nManager'

console.log('🧪 Testing I18nManager\n')

// Test 1: Get available languages
console.log('📝 Idiomas disponibles:')
const languages = I18nManager.getAvailableLanguages()
languages.forEach(lang => {
  console.log(`  - ${lang.code}: ${lang.name}`)
})

// Test 2: Get translation in Spanish
console.log('\n🇪🇸 Prueba en Español:')
I18nManager.setLanguage('es')
console.log(`  app.title: ${I18nManager.t('app.title')}`)
console.log(`  auth.login_title: ${I18nManager.t('auth.login_title')}`)
console.log(`  server.title: ${I18nManager.t('server.title')}`)

// Test 3: Get translation in English
console.log('\n🇬🇧 Prueba en English:')
I18nManager.setLanguage('en')
console.log(`  app.title: ${I18nManager.t('app.title')}`)
console.log(`  auth.login_title: ${I18nManager.t('auth.login_title')}`)
console.log(`  server.title: ${I18nManager.t('server.title')}`)

// Test 4: Get translation in Chinese
console.log('\n🇨🇳 Prueba en 中文:')
I18nManager.setLanguage('zh')
console.log(`  app.title: ${I18nManager.t('app.title')}`)
console.log(`  auth.login_title: ${I18nManager.t('auth.login_title')}`)

// Test 5: Language change listeners
console.log('\n🔔 Prueba de listeners:')
I18nManager.setLanguage('es')
const unsubscribe = I18nManager.onLanguageChange((lang: Language) => {
  console.log(`  ✨ Idioma cambió a: ${lang}`)
})

I18nManager.setLanguage('pt')
I18nManager.setLanguage('de')
unsubscribe()

// Test 6: Invalid key returns default
console.log('\n⚠️  Prueba de key inválida:')
const result = I18nManager.t('nonexistent.key', 'DEFAULT VALUE')
console.log(`  Result: ${result}`)

console.log('\n✅ Todos los tests completados!')

import convict from 'convict'

const config = convict({
  publicKey: {
    doc: 'The Grants UI public key.',
    format: String,
    default: '',
    env: 'GRANTS_UI_PUBLIC_KEY'
  }
})

config.validate({ allowed: 'strict' })

export default config

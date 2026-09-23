import styles from './BankIdMark.module.css'

export function BankIdMark() {
  return (
    <div className={styles.wrap}>
      <img src="/logos/bankid-logo-white.svg" alt="BankID" style={{ height: 64, width: 'auto' }} />
    </div>
  )
}

import styles from './BankIdMark.module.css'

interface BankIdMarkProps {
  height?: number
  /**
   * True when this mark sits next to text that already says what it is
   * (the submit button's own label, the "BankID-ansluten" trust badge
   * text) — sets alt="" so the image is excluded from the accessible
   * name computation instead of duplicating/garbling it (e.g. a button
   * whose name would otherwise become "BankID Logga in med BankID").
   */
  decorative?: boolean
}

export function BankIdMark({ height = 64, decorative = false }: BankIdMarkProps) {
  return (
    <div className={styles.wrap}>
      <img
        src="/logos/bankid-logo-white.svg"
        alt={decorative ? '' : 'BankID'}
        style={{ height, width: 'auto' }}
      />
    </div>
  )
}

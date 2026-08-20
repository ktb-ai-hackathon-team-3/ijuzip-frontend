import styles from './BrandLogo.module.css';

interface BrandLogoProps {
  className?: string;
  decorative?: boolean;
}

export function BrandLogo({ className = '', decorative = false }: BrandLogoProps) {
  return (
    <img
      className={`${styles.logo} ${className}`}
      src="/brand/ijuzip-logo.png"
      alt={decorative ? '' : 'IJU.zip'}
      aria-hidden={decorative || undefined}
    />
  );
}

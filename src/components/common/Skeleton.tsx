import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: number;
}

export function Skeleton({ width = '100%', height = 14, radius = 6 }: SkeletonProps) {
  return <span className={styles.skeleton} style={{ width, height, borderRadius: radius }} aria-hidden="true" />;
}

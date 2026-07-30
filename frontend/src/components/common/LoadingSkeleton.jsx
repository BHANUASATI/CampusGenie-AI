import { cn } from '../../utils/cn';

const LoadingSkeleton = ({ className }) => {
  return (
    <div
      className={cn(
        'animate-pulse bg-gray-200 dark:bg-gray-700 rounded',
        className
      )}
    />
  );
};

export default LoadingSkeleton;

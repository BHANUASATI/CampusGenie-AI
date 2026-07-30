import { AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

const ErrorState = ({ title, description, onRetry, className }) => {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      <div className="w-16 h-16 mb-4 text-red-500">
        <AlertCircle className="w-full h-full" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 max-w-sm mb-6">
        {description}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
};

export default ErrorState;

import { cn } from '../../utils/cn';

const EmptyState = ({ icon: Icon, title, description, action, className }) => {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      {Icon && (
        <div className="w-16 h-16 mb-4 text-gray-400">
          <Icon className="w-full h-full" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 max-w-sm mb-6">
        {description}
      </p>
      {action}
    </div>
  );
};

export default EmptyState;

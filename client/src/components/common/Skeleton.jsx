import React from 'react';

export const SkeletonProfile = ({
  className = ''
}) => <div className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse ${className}`}>
    <div className="mb-8">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
        </div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
      </div>
    </div>

    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
      <div className="mb-8">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-6"></div>

        <div className="flex items-start space-x-6 mb-6">
          <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          <div className="flex-grow space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, index) => <div key={index} className="space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            </div>)}
        </div>

        <div className="mt-6 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-4"></div>
        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
      </div>

      <div className="mb-8">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-4"></div>
        <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
      </div>

      <div className="mb-8">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4"></div>
        <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
      </div>

      <div className="mb-8">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-4"></div>
        <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
      </div>

      <div>
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-4"></div>
        <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
      </div>
    </div>

    <div className="mt-8 flex space-x-3">
      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
    </div>
  </div>;

export const SkeletonTable = ({
  rows = 5,
  columns = 7,
  className = ''
}) => <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900/50">
          <tr>
            {Array.from({
            length: columns
          }).map((_, index) => <th key={index} className="px-6 py-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </th>)}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {Array.from({
          length: rows
        }).map((_, rowIndex) => <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              {Array.from({
            length: columns
          }).map((_, colIndex) => <td key={colIndex} className="px-6 py-4 whitespace-nowrap">
                  {colIndex === 0 ? <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                      <div className="ml-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-1 animate-pulse"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
                      </div>
                    </div> : colIndex === columns - 2 ? <div className="flex flex-wrap gap-1">
                      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-12 animate-pulse"></div>
                      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-16 animate-pulse"></div>
                      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-10 animate-pulse"></div>
                    </div> : colIndex === columns - 3 ? <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-20 animate-pulse"></div> : colIndex === columns - 1 ? <div className="flex items-center justify-end space-x-2">
                      <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </div> : <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>}
                </td>)}
            </tr>)}
        </tbody>
      </table>
    </div>
  </div>;

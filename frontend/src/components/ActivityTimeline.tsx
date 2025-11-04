import React from 'react';

interface Activity {
  id: string;
  type: string;
  amount?: string;
  description: string;
  timestamp: string;
  hash?: string;
  status: string;
  error?: string;
}

interface ActivityTimelineProps {
  activities: Activity[];
}

const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ activities }) => {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No activities found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="border rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium capitalize">{activity.type}</h3>
              <p className="text-sm text-gray-600">{activity.description}</p>
              {activity.amount && (
                <p className="text-sm">
                  {activity.type === 'withdraw' ? '-' : '+'}
                  {(Math.abs(parseFloat(activity.amount)) / 1e18).toFixed(4)} ETH
                </p>
              )}
              {activity.hash && (
                <a
                  href={`https://etherscan.io/tx/${activity.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 text-sm"
                >
                  {activity.hash}
                </a>
              )}
            </div>
            <div className="text-right">
              <span className={`px-2 py-1 rounded text-xs ${
                activity.status === 'completed' ? 'bg-green-100 text-green-800' :
                activity.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {activity.status}
              </span>
              {activity.error && (
                <p className="text-red-500 text-xs mt-1">{activity.error}</p>
              )}
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xs text-gray-400">
              {new Date(activity.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActivityTimeline;
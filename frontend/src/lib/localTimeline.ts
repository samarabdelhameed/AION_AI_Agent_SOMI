export type LocalActivity = {
	id: string;
	type: 'deposit' | 'withdraw' | 'rebalance' | 'yield' | 'decision';
	status: 'completed' | 'pending' | 'failed';
	timestamp: string; // ISO
	amount?: number;
	currency?: string;
	fromStrategy?: string;
	toStrategy?: string;
	txHash?: string;
	gasUsed?: number;
	description?: string;
};

const STORAGE_KEY = 'aion.timeline.local';

export function loadLocalActivities(): LocalActivity[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

export function appendLocalActivity(activity: Omit<LocalActivity, 'id'>) {
	const list = loadLocalActivities();
	const entry: LocalActivity = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ...activity };
	list.unshift(entry);
	localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 100)));
	return entry;
}



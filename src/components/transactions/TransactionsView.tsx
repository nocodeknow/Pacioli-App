import { useLocation } from 'wouter';
import TransactionsListView from './TransactionsListView';
import TransactionFormView from './TransactionFormView';

export default function TransactionsView() {
  const [location] = useLocation();
  const pathParts = location.split('/').filter(Boolean);
  const activeDetail = pathParts.length > 1 ? `transaction-${pathParts[1]}` : null;
  const editingId = pathParts[2];

  // Dispatch view based on routing detail parameters
  if (activeDetail === 'transaction-add' || activeDetail === 'transaction-edit') {
    return (
      <TransactionFormView 
        mode={activeDetail === 'transaction-add' ? 'add' : 'edit'}
        id={editingId}
      />
    );
  }

  return <TransactionsListView />;
}

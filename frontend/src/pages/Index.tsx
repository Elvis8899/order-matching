import { ExchangeProvider, useExchange } from '@/lib/ExchangeContext';
import Login from '@/pages/Login';
import Exchange from '@/pages/Exchange';
import { Toaster as Sonner } from '@/components/ui/sonner';

const AppContent = () => {
  const { user } = useExchange();
  return user ? <Exchange /> : <Login />;
};

const Index = () => {
  return (
    <ExchangeProvider>
      <Sonner />
      <AppContent />
    </ExchangeProvider>
  );
};

export default Index;

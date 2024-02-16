import { Metadata } from 'next';
import { fetchFilteredCustomers } from '@/app/lib/data';
import CustomersTable from '@/app/ui/customers/table';
export const metadata: Metadata = {
  title: 'Customers',
};

export default async function Page({
  //Page components accept a prop called searchParams, so you can pass the current URL params to the <Table> component.
  searchParams,
}: {
  searchParams?: {
    query?: string;
    page?: string;
  };
}) {
  const customers = await fetchFilteredCustomers(searchParams?.query || '');

  return <CustomersTable customers={customers} />;
}

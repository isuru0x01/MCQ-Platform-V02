"use client"

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { BarChartBetter } from './_components/bar-chart-better';
import { supabaseClient } from '@/lib/supabaseClient';
import Image from 'next/image';

export default function Dashboard() {
  const [resources, setResources] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);

  useEffect(() => {
    fetchResources();
    fetchPerformance();
  }, []);

  const fetchResources = async () => {
    try {
      const { data: resourcesData, error } = await supabaseClient
        .from('Resource')
        .select('*')
        .order('createdAt', { ascending: false })
        .limit(5);
      if (error) throw error;
      setResources(resourcesData || []);
    } catch (error) {
      console.error('Error fetching resources:', error);
    }
  };

  const fetchPerformance = async () => {
    try {
      const { data: performanceData, error } = await supabaseClient
        .from('Performance')
        .select('*')
        .order('createdat', { ascending: false })
        .limit(10);
      if (error) throw error;
      setPerformanceData(performanceData || []);
    } catch (error) {
      console.error('Error fetching performance data:', error);
    }
  };

  return (
    <div className='flex flex-col justify-center items-start flex-wrap px-4 pt-4 gap-4'>
      
      <div className='grid md:grid-cols-1 sm:grid-cols-1 w-full gap-3'>
      <Card className="p-4 shadow-md">
  <CardHeader className="flex flex-row items-center justify-between">
    <div className="grid gap-2">
      <CardTitle className="text-lg font-bold">Latest Resources</CardTitle>
      <CardDescription className="text-sm text-gray-500">Recent resources added by users</CardDescription>
    </div>
    <Button asChild size="sm" className="ml-auto gap-1">
      <Link href="/dashboard/resources">
        View All
        <ArrowUpRight className="h-4 w-4" />
      </Link>
    </Button>
  </CardHeader>
  <CardContent className="mt-4">
    <div className="max-h-[320px] overflow-y-auto">
      {resources.length > 0 ? (
        <ul className="space-y-2">
          {resources.map((resource) => (
            <li
              key={resource.id}
              className="flex items-center space-x-2 px-2 py-1 hover:bg-gray-100 transition duration-300 ease-in-out"
            >
              <Image
                src={resource.image_url || placeholderImage}
                alt="Resource thumbnail"
                width={40}
                height={40}
                className="rounded-md"
              />
              <Link href={`/dashboard/quiz/${resource.id}`} className="text-blue-600 hover:text-blue-800">
                {resource.title}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-center text-gray-500">No recent resources available.</p>
      )}
    </div>
  </CardContent>
</Card>
      </div>
    </div>
  );
}
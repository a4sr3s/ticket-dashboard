'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Ticket, CheckCircle, BarChart2 } from 'lucide-react';

interface TicketCounts {
  openTickets: number;
  resolvedTickets: number;
  totalTickets: number;
}

export default function ChatPage() {
  const [openTickets, setOpenTickets] = useState<number | null>(null);
  const [resolvedTickets, setResolvedTickets] = useState<number | null>(null);
  const [totalTickets, setTotalTickets] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string | any }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchTicketCounts = async () => {
      try {
        const response = await fetch('/api/tickets');
        if (!response.ok) throw new Error('Failed to fetch ticket counts');
        const data = await response.json();
        setOpenTickets(data.openTickets);
        setResolvedTickets(data.resolvedTickets);
        setTotalTickets(data.totalTickets);
      } catch (error) {
        console.error('Error fetching ticket counts:', error);
      }
    };
    fetchTicketCounts();
  }, []);

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    setIsLoading(true);
    const userMessage = { role: 'user', content: message };
    setChatHistory((prev) => [...prev, userMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...chatHistory, userMessage] }),
      });
      if (!response.ok) throw new Error(`Error: ${response.statusText}`);

      const data = await response.json();
      const agentResponse = data.choices[0].message.content;
      setChatHistory((prev) => [...prev, { role: 'assistant', content: agentResponse }]);
    } catch (error) {
      console.error('Error:', error);
      setChatHistory((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
      ]);
    } finally {
      setMessage('');
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSendMessage();
  };

  const renderMessageContent = (content: string | any) => {
    if (typeof content === 'string' && content.includes('|')) {
      const rows = content.trim().split('\n').map((row) => row.split('|').slice(1, -1));

      return (
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-300 text-left">
            <thead className="bg-gray-100">
              <tr>
                {rows[0].map((header, index) => (
                  <th key={index} className="p-2 border border-gray-300 font-semibold">
                    {header.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(1).map((row, rowIndex) => (
                <tr key={rowIndex} className="even:bg-gray-50">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="p-2 border border-gray-300">
                      {cell.trim()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    return <div>{content}</div>;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Ticket Dashboard</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex justify-between pb-2">
              <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
              <Ticket className="h-5 w-5 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {openTickets !== null ? openTickets : 'Loading...'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex justify-between pb-2">
              <CardTitle className="text-sm font-medium">Resolved Tickets</CardTitle>
              <CheckCircle className="h-5 w-5 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {resolvedTickets !== null ? resolvedTickets : 'Loading...'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              <BarChart2 className="h-5 w-5 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalTickets !== null ? totalTickets : 'Loading...'}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Chat with GenAI Agent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] overflow-y-auto border rounded-lg p-4 bg-white space-y-4">
              {chatHistory.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-lg w-full p-3 rounded-lg text-sm shadow ${
                      msg.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-900'
                    }`}
                  >
                    {renderMessageContent(msg.content)}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex mt-4 space-x-2">
              <Input
                type="text"
                placeholder="Type your message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button onClick={handleSendMessage} disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

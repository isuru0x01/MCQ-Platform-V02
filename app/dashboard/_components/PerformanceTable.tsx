// _components/PerformanceTable.js
import React from 'react';

const PerformanceTable = ({ data }) => {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="text-left">
          <th className="p-2 border">ID</th>
          <th className="p-2 border">Quiz ID</th>
          <th className="p-2 border">User ID</th>
          <th className="p-2 border">Score</th>
          <th className="p-2 border">Created At</th>
        </tr>
      </thead>
      <tbody>
        {data.map((performance) => (
          <tr key={performance.id} className="border">
            <td className="p-2 border">{performance.id}</td>
            <td className="p-2 border">{performance.quizId}</td>
            <td className="p-2 border">{performance.userId}</td>
            <td className="p-2 border">{performance.score}</td>
            <td className="p-2 border">{new Date(performance.createdAt).toLocaleDateString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default PerformanceTable;
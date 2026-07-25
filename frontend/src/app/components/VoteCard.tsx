'use client';
import axios from 'axios'; // Fixes "Cannot find name 'axios'"

// Define the shape of the Athlete to fix "implicitly has an 'any' type"
interface AthleteProps {
  athlete: {
    id: number;
    name: string;
  };
}

export default function VoteCard({ athlete }: AthleteProps) {
  const handleVote = async () => {
    try {
      // Updated to HTTPS and your production domain
      await axios.post('https://yourdomain.com', { 
        athlete_id: athlete.id 
      });
      alert("Vote cast for Player of the Week!");
    } catch {
      alert("You have already voted this week or the session expired.");
    }
  };

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all">
      <h3 className="text-xl font-bold text-gray-900 mb-4">{athlete.name}</h3>
      <button 
        onClick={handleVote} 
        className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition"
      >
        Vote for Player of the Week
      </button>
    </div>
  );
}

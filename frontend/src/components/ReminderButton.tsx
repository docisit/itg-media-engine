'use client';

import React from 'react';

const ReminderButton = () => {
  const handleClick = () => {
    console.log('Set reminder clicked');
    // Placeholder for reminder logic
    alert('Reminder functionality is not yet implemented.');
  };

  return (
    <button
      onClick={handleClick}
      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
    >
      Set Reminder
    </button>
  );
};

export default ReminderButton;

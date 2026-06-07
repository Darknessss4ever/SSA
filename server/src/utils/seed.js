const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const connectDB = require('../config/db');
const User = require('../models/User');
const Sport = require('../models/Sport');
const Slot = require('../models/Slot');
const Announcement = require('../models/Announcement');
const Employee = require('../models/Employee');
const FinancialTransaction = require('../models/FinancialTransaction');

const SPORTS_DATA = [
  {
    name: 'Swimming',
    description: 'Olympic-size heated pool with professional lifeguards. Perfect for all skill levels.',
    color: '#06b6d4',
    icon: '🏊',
    pricePerSlot: 150,
    maxCapacity: 10,
    duration: 60,
    features: ['Olympic-size pool', 'Heated water', 'Professional lifeguard', 'Locker room'],
  },
  {
    name: 'Gym',
    description: 'State-of-the-art fitness equipment with expert trainers available on demand.',
    color: '#f59e0b',
    icon: '💪',
    pricePerSlot: 100,
    maxCapacity: 20,
    duration: 60,
    features: ['Modern equipment', 'Expert trainers', 'Cardio zone', 'Protein shakes'],
  },
  {
    name: 'Badminton',
    description: 'Professional synthetic courts with proper lighting for the perfect game.',
    color: '#10b981',
    icon: '🏸',
    pricePerSlot: 200,
    maxCapacity: 4,
    duration: 60,
    features: ['4 courts', 'Professional nets', 'Equipment rental', 'Coaching available'],
  },
  {
    name: 'Box Cricket',
    description: 'Full-featured box cricket arena with state-of-the-art bowling machine for practice.',
    color: '#8b5cf6',
    icon: '🏏',
    pricePerSlot: 500,
    maxCapacity: 12,
    duration: 60,
    features: ['Bowling machine', 'Turf pitch', 'Night play', 'Scoreboards'],
  },
  {
    name: 'Box Football',
    description: 'Enclosed 5-a-side football arena with artificial turf for intense matches.',
    color: '#ef4444',
    icon: '⚽',
    pricePerSlot: 600,
    maxCapacity: 10,
    duration: 60,
    features: ['Artificial turf', 'Goal posts', 'Night play', 'Electronic scoreboard'],
  },
];

const ANNOUNCEMENTS_DATA = [
  {
    title: '🎉 Grand Opening Offer!',
    content: 'Get 20% off on your first month subscription. Use code SHSA20 at checkout.',
    type: 'offer',
    isPinned: true,
  },
  {
    title: '🏏 Box Cricket Tournament - May 2026',
    content: 'Register now for the ShreeHari Box Cricket Premier League. Prize pool: ₹50,000. Registration closes April 30th.',
    type: 'event',
    isPinned: true,
  },
  {
    title: '🔧 Maintenance Notice',
    content: 'Swimming pool will be closed for maintenance on April 28th (Monday) from 6 AM to 12 PM.',
    type: 'maintenance',
    isPinned: false,
  },
  {
    title: '⚽ New Football Turf Installed',
    content: 'We\'ve upgraded to FIFA-quality artificial turf in our Box Football arena. Book your slot now!',
    type: 'general',
    isPinned: false,
  },
];

const seed = async () => {
  try {
    await connectDB();
    console.log('🌱 Starting database seed...');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Sport.deleteMany({}),
      Slot.deleteMany({}),
      Announcement.deleteMany({}),
      Employee.deleteMany({}),
      FinancialTransaction.deleteMany({}),
    ]);

    // Create admin
    const admin = await User.create({
      name: 'Admin ShreeHari',
      email: 'admin@shsa.com',
      password: 'Admin@123',
      role: 'admin',
      phone: '+91 9876543210',
    });
    console.log('✅ Admin created: admin@shsa.com / Admin@123');

    // Create test user
    const user = await User.create({
      name: 'Rahul Sharma',
      email: 'rahul@test.com',
      password: 'User@123',
      role: 'user',
      phone: '+91 9898989898',
    });
    console.log('✅ Test user created: rahul@test.com / User@123');

    // Create sports
    const sports = await Sport.insertMany(SPORTS_DATA);
    console.log(`✅ Created ${sports.length} sports`);

    // Create announcements
    const announcements = await Announcement.insertMany(
      ANNOUNCEMENTS_DATA.map(a => ({ ...a, createdBy: admin._id }))
    );
    console.log(`✅ Created ${announcements.length} announcements`);

    // Generate slots for next 7 days
    const today = new Date();
    let slotCount = 0;

    for (const sport of sports) {
      for (let day = 0; day < 7; day++) {
        const date = new Date(today);
        date.setDate(today.getDate() + day);
        const dateStr = date.toISOString().split('T')[0];

        // 6 AM to 10 PM, 1-hour slots
        for (let hour = 6; hour < 22; hour++) {
          const startTime = String(hour).padStart(2, '0') + ':00';
          const endTime = String(hour + 1).padStart(2, '0') + ':00';
          try {
            await Slot.create({
              sportId: sport._id,
              date: dateStr,
              startTime,
              endTime,
              capacity: sport.maxCapacity,
              price: sport.pricePerSlot,
              createdBy: admin._id,
            });
            slotCount++;
          } catch (_) {}
        }
      }
    }

    console.log(`✅ Generated ${slotCount} slots`);

    // Create employees
    const employeesData = [
      { name: 'Sunil Kumar', email: 'sunil@shsa.com', phone: '+91 9111111111', role: 'Coach', salary: 35000, status: 'Active', notes: 'Swimming and Badminton coach' },
      { name: 'Amit Sharma', email: 'amit@shsa.com', phone: '+91 9222222222', role: 'Manager', salary: 50000, status: 'Active', notes: 'Overall arena manager' },
      { name: 'Priya Patel', email: 'priya@shsa.com', phone: '+91 9333333333', role: 'Staff', salary: 25000, status: 'Active', notes: 'Front desk and bookings operator' },
      { name: 'Rajesh Singh', email: 'rajesh@shsa.com', phone: '+91 9444444444', role: 'Coach', salary: 40000, status: 'Active', notes: 'Box Cricket and Box Football coach' },
    ];
    const employees = await Employee.insertMany(employeesData);
    console.log(`✅ Created ${employees.length} employees`);

    // Create financial transactions for past 6 months
    const financialTransactions = [];
    const monthlyStaffSalarySum = employees.reduce((acc, emp) => acc + emp.salary, 0);

    const todayDate = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(todayDate.getFullYear(), todayDate.getMonth() - i, 15);
      
      // Income transactions
      financialTransactions.push({
        type: 'income',
        amount: 80000 + Math.floor(Math.random() * 20000),
        category: 'membership',
        status: 'paid',
        date: d,
        paymentMethod: 'upi',
        description: `Monthly membership sales for ${d.toLocaleString('default', { month: 'short' })}`
      });

      financialTransactions.push({
        type: 'income',
        amount: 30000 + Math.floor(Math.random() * 10000),
        category: 'coaching',
        status: 'paid',
        date: d,
        paymentMethod: 'bank_transfer',
        description: `Coaching program registrations for ${d.toLocaleString('default', { month: 'short' })}`
      });

      financialTransactions.push({
        type: 'income',
        amount: 15000 + Math.floor(Math.random() * 8000),
        category: 'booking',
        status: 'paid',
        date: d,
        paymentMethod: 'cash',
        description: `Individual slot bookings for ${d.toLocaleString('default', { month: 'short' })}`
      });

      // Expense transactions
      financialTransactions.push({
        type: 'expense',
        amount: monthlyStaffSalarySum,
        category: 'salary',
        status: 'paid',
        date: d,
        paymentMethod: 'bank_transfer',
        description: `Staff salaries payout for ${d.toLocaleString('default', { month: 'short' })}`
      });

      financialTransactions.push({
        type: 'expense',
        amount: 40000,
        category: 'rent',
        status: 'paid',
        date: d,
        paymentMethod: 'bank_transfer',
        description: 'Monthly arena lease rent'
      });

      financialTransactions.push({
        type: 'expense',
        amount: 10000 + Math.floor(Math.random() * 4000),
        category: 'utilities',
        status: 'paid',
        date: d,
        paymentMethod: 'bank_transfer',
        description: 'Electricity, water, and internet bills'
      });

      financialTransactions.push({
        type: 'expense',
        amount: 5000 + Math.floor(Math.random() * 5000),
        category: 'maintenance',
        status: 'paid',
        date: d,
        paymentMethod: 'upi',
        description: 'Turf and pool maintenance costs'
      });

      // Occasional tournament income & equipment expense
      if (i % 2 === 0) {
        financialTransactions.push({
          type: 'income',
          amount: 25000,
          category: 'tournament',
          status: 'paid',
          date: d,
          paymentMethod: 'upi',
          description: `Tournament registration fees`
        });

        financialTransactions.push({
          type: 'expense',
          amount: 15000,
          category: 'purchase',
          status: 'paid',
          date: d,
          paymentMethod: 'card',
          description: 'Sports equipment purchase (balls, bats, nets)'
        });
      }
    }

    // Add some pending dues for the current month
    const userRahul = await User.findOne({ email: 'rahul@test.com' });
    const dueDate1 = new Date();
    dueDate1.setDate(todayDate.getDate() + 5);
    const dueDate2 = new Date();
    dueDate2.setDate(todayDate.getDate() + 10);

    financialTransactions.push({
      type: 'income',
      amount: 1200,
      category: 'booking',
      status: 'pending',
      date: new Date(),
      dueDate: dueDate1,
      paymentMethod: 'cash',
      description: 'Pending court booking due',
      referenceId: userRahul ? userRahul._id : null,
      referenceModel: 'User'
    });

    financialTransactions.push({
      type: 'income',
      amount: 4500,
      category: 'membership',
      status: 'pending',
      date: new Date(),
      dueDate: dueDate2,
      paymentMethod: 'upi',
      description: 'Membership renewal due',
      referenceId: userRahul ? userRahul._id : null,
      referenceModel: 'User'
    });

    await FinancialTransaction.insertMany(financialTransactions);
    console.log(`✅ Generated ${financialTransactions.length} financial transactions`);

    console.log('\n🏆 Seed completed successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('   Admin: admin@shsa.com / Admin@123');
    console.log('   User:  rahul@test.com / User@123');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seed();

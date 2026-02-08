"""
BleSaf Banking App - Customer Flow Simulation
Generates realistic demo data for a 30-minute presentation
"""

import random
import json
from datetime import datetime, timedelta
from typing import List, Dict, Tuple
import pandas as pd

# Configuration
SIMULATION_START_TIME = datetime.strptime("2024-10-26 13:45", "%Y-%m-%d %H:%M")
SIMULATION_DURATION_MINUTES = 120  # 2 hours of data
BRANCH_NAME = "Agence Lac 2"

# Service types with average duration and frequency
SERVICES = {
    "Dépôt d'espèces": {"avg_duration": 8, "std_dev": 2, "frequency": 0.35},
    "Retrait d'espèces": {"avg_duration": 6, "std_dev": 1.5, "frequency": 0.20},
    "Consultation": {"avg_duration": 12, "std_dev": 3, "frequency": 0.15},
    "Relevés de compte": {"avg_duration": 5, "std_dev": 1, "frequency": 0.15},
    "Virement": {"avg_duration": 10, "std_dev": 2.5, "frequency": 0.10},
    "Autres": {"avg_duration": 7, "std_dev": 2, "frequency": 0.05}
}

# Counter prefixes by service type
COUNTER_PREFIXES = {
    "Dépôt d'espèces": "D",
    "Retrait d'espèces": "R",
    "Consultation": "C",
    "Relevés de compte": "R",
    "Virement": "V",
    "Autres": "A"
}

# Teller names
TELLERS = [
    {"id": "G1", "name": "Mohamed Sassi", "efficiency": 1.0},
    {"id": "G2", "name": "Leila Hamdi", "efficiency": 0.95},
    {"id": "G3", "name": "Farid Kallel", "efficiency": 1.05},
    {"id": "G4", "name": "Yasmine Mansour", "efficiency": 0.90}
]

# Customer names (Tunisian/Arabic names)
CUSTOMER_FIRST_NAMES = [
    "Mohamed", "Ahmed", "Fatma", "Amira", "Karim", "Leila", "Youssef", "Salma",
    "Omar", "Nadia", "Hamza", "Ines", "Rami", "Sonia", "Tarek", "Mariem",
    "Ali", "Hana", "Mehdi", "Rim", "Samir", "Dorra", "Walid", "Emna"
]

CUSTOMER_LAST_NAMES = [
    "Ben Ali", "Trabelsi", "Gharbi", "Bouazizi", "Jebali", "Hamdi", "Kallel",
    "Mansour", "Sassi", "Khedher", "Mejri", "Dridi", "Chouchane", "Ayari"
]

class CustomerFlowSimulator:
    def __init__(self):
        self.current_time = SIMULATION_START_TIME
        self.customers = []
        self.ticket_counter = {"D": 1, "R": 1, "C": 1, "V": 1, "A": 1}
        self.active_tellers = []
        self.queue = []
        self.served_customers = []
        self.events = []
        
    def generate_customer_name(self) -> str:
        """Generate a random Tunisian customer name"""
        first = random.choice(CUSTOMER_FIRST_NAMES)
        last = random.choice(CUSTOMER_LAST_NAMES)
        return f"{first} {last}"
    
    def generate_ticket_number(self, service: str) -> str:
        """Generate ticket number based on service type"""
        prefix = COUNTER_PREFIXES[service]
        number = self.ticket_counter[prefix]
        self.ticket_counter[prefix] += 1
        return f"{prefix}-{number:03d}"
    
    def calculate_arrival_rate(self, current_minute: int) -> float:
        """Calculate customer arrival rate based on time of day"""
        # Peak hours: 14:00-15:00 (higher arrival rate)
        # Off-peak: 13:45-14:00 and 15:00-16:00 (lower rate)
        hour = (current_minute // 60) + 13
        minute_in_hour = current_minute % 60
        
        if hour == 14:  # Peak hour
            return 0.25  # 25% chance per minute (15 customers/hour)
        elif hour == 13 and minute_in_hour >= 45:  # Building up
            return 0.15  # 9 customers/hour
        else:  # Off-peak
            return 0.10  # 6 customers/hour
    
    def select_service(self) -> str:
        """Select service type based on frequency distribution"""
        rand = random.random()
        cumulative = 0
        for service, props in SERVICES.items():
            cumulative += props["frequency"]
            if rand <= cumulative:
                return service
        return "Autres"
    
    def calculate_service_duration(self, service: str, teller_efficiency: float) -> int:
        """Calculate service duration with randomness and teller efficiency"""
        avg = SERVICES[service]["avg_duration"]
        std = SERVICES[service]["std_dev"]
        duration = max(1, int(random.gauss(avg, std) / teller_efficiency))
        return duration
    
    def simulate_arrivals(self, minute: int):
        """Simulate customer arrivals for a given minute"""
        arrival_rate = self.calculate_arrival_rate(minute)
        
        # Multiple customers can arrive in the same minute
        num_arrivals = 0
        while random.random() < arrival_rate:
            num_arrivals += 1
            service = self.select_service()
            customer = {
                "id": len(self.customers) + 1,
                "name": self.generate_customer_name(),
                "ticket": self.generate_ticket_number(service),
                "service": service,
                "arrival_time": self.current_time + timedelta(seconds=random.randint(0, 59)),
                "status": "waiting",
                "wait_time": 0,
                "service_duration": None,
                "teller_id": None,
                "teller_name": None,
                "service_start": None,
                "service_end": None
            }
            self.customers.append(customer)
            self.queue.append(customer)
            
            # Log event
            self.events.append({
                "time": customer["arrival_time"],
                "type": "arrival",
                "customer_id": customer["id"],
                "ticket": customer["ticket"],
                "service": service,
                "queue_length": len(self.queue)
            })
    
    def assign_customers_to_tellers(self):
        """Assign waiting customers to available tellers"""
        for teller in self.active_tellers:
            if teller["current_customer"] is None and len(self.queue) > 0:
                # Find next customer that can be served by this teller
                # (In real system, counters can be configured for specific services)
                customer = self.queue.pop(0)
                
                # Calculate service duration
                duration = self.calculate_service_duration(
                    customer["service"],
                    teller["efficiency"]
                )
                
                customer["status"] = "being_served"
                customer["service_start"] = self.current_time
                customer["service_end"] = self.current_time + timedelta(minutes=duration)
                customer["service_duration"] = duration
                customer["teller_id"] = teller["id"]
                customer["teller_name"] = teller["name"]
                customer["wait_time"] = (customer["service_start"] - customer["arrival_time"]).total_seconds() / 60
                
                teller["current_customer"] = customer
                teller["service_end_time"] = customer["service_end"]
                
                # Log event
                self.events.append({
                    "time": self.current_time,
                    "type": "service_start",
                    "customer_id": customer["id"],
                    "ticket": customer["ticket"],
                    "teller_id": teller["id"],
                    "teller_name": teller["name"],
                    "wait_time": round(customer["wait_time"], 2),
                    "queue_length": len(self.queue)
                })
    
    def complete_services(self):
        """Complete services for customers whose service time has ended"""
        for teller in self.active_tellers:
            if teller["current_customer"] is not None:
                if self.current_time >= teller["service_end_time"]:
                    customer = teller["current_customer"]
                    customer["status"] = "completed"
                    self.served_customers.append(customer)
                    
                    # Log event
                    self.events.append({
                        "time": self.current_time,
                        "type": "service_complete",
                        "customer_id": customer["id"],
                        "ticket": customer["ticket"],
                        "teller_id": teller["id"],
                        "service_duration": customer["service_duration"],
                        "total_time": round((customer["service_end"] - customer["arrival_time"]).total_seconds() / 60, 2)
                    })
                    
                    # Free up teller
                    teller["current_customer"] = None
                    teller["service_end_time"] = None
                    teller["customers_served"] += 1
    
    def update_queue_wait_times(self):
        """Update wait times for customers in queue"""
        for customer in self.queue:
            customer["wait_time"] = (self.current_time - customer["arrival_time"]).total_seconds() / 60
    
    def activate_teller(self, teller_id: str):
        """Activate a teller"""
        teller_info = next(t for t in TELLERS if t["id"] == teller_id)
        teller = {
            "id": teller_info["id"],
            "name": teller_info["name"],
            "efficiency": teller_info["efficiency"],
            "status": "active",
            "current_customer": None,
            "service_end_time": None,
            "customers_served": 0,
            "activation_time": self.current_time
        }
        self.active_tellers.append(teller)
        
        self.events.append({
            "time": self.current_time,
            "type": "teller_activated",
            "teller_id": teller_id,
            "teller_name": teller_info["name"]
        })
    
    def deactivate_teller(self, teller_id: str):
        """Deactivate a teller (for breaks)"""
        teller = next((t for t in self.active_tellers if t["id"] == teller_id), None)
        if teller and teller["current_customer"] is None:
            self.active_tellers.remove(teller)
            
            self.events.append({
                "time": self.current_time,
                "type": "teller_deactivated",
                "teller_id": teller_id,
                "reason": "break"
            })
            return True
        return False
    
    def get_current_state(self) -> Dict:
        """Get current state of the branch"""
        waiting_customers = [c for c in self.customers if c["status"] == "waiting"]
        being_served = [c for c in self.customers if c["status"] == "being_served"]
        
        # Calculate average wait time
        if self.served_customers:
            avg_wait = sum(c["wait_time"] for c in self.served_customers) / len(self.served_customers)
        else:
            avg_wait = 0
        
        # Calculate SLA compliance (15 min threshold)
        if self.served_customers:
            sla_compliant = sum(1 for c in self.served_customers if c["wait_time"] <= 15)
            sla_percentage = (sla_compliant / len(self.served_customers)) * 100
        else:
            sla_percentage = 100
        
        # Service breakdown
        service_breakdown = {}
        for service in SERVICES.keys():
            service_customers = [c for c in waiting_customers if c["service"] == service]
            if service_customers:
                avg_wait_service = sum(c["wait_time"] for c in service_customers) / len(service_customers)
                service_breakdown[service] = {
                    "count": len(service_customers),
                    "avg_wait": round(avg_wait_service, 1)
                }
        
        return {
            "time": self.current_time.strftime("%H:%M"),
            "queue_length": len(waiting_customers),
            "being_served": len(being_served),
            "total_served": len(self.served_customers),
            "active_counters": len(self.active_tellers),
            "avg_wait_time": round(avg_wait, 1),
            "sla_compliance": round(sla_percentage, 1),
            "waiting_customers": [
                {
                    "ticket": c["ticket"],
                    "name": c["name"],
                    "service": c["service"],
                    "wait_time": round(c["wait_time"], 1)
                }
                for c in waiting_customers[:10]  # Top 10
            ],
            "active_tellers": [
                {
                    "id": t["id"],
                    "name": t["name"],
                    "status": "busy" if t["current_customer"] else "available",
                    "current_ticket": t["current_customer"]["ticket"] if t["current_customer"] else None,
                    "customers_served": t["customers_served"]
                }
                for t in self.active_tellers
            ],
            "service_breakdown": service_breakdown
        }
    
    def run_simulation(self):
        """Run the complete simulation"""
        print(f"Starting simulation at {SIMULATION_START_TIME.strftime('%H:%M')}")
        
        # Initial setup: Activate 2 tellers
        self.activate_teller("G1")
        self.activate_teller("G2")
        
        # Simulate minute by minute
        for minute in range(SIMULATION_DURATION_MINUTES):
            self.current_time = SIMULATION_START_TIME + timedelta(minutes=minute)
            
            # Process in order:
            # 1. Complete any finished services
            self.complete_services()
            
            # 2. New customer arrivals
            self.simulate_arrivals(minute)
            
            # 3. Assign customers to available tellers
            self.assign_customers_to_tellers()
            
            # 4. Update wait times
            self.update_queue_wait_times()
            
            # Demo-specific events (to create interesting scenarios)
            # At 14:15 (30 min in), activate G3 due to queue buildup
            if minute == 30:
                self.activate_teller("G3")
            
            # At 14:45 (60 min in), G2 takes a break
            if minute == 60:
                self.deactivate_teller("G2")
            
            # At 15:00 (75 min in), G2 returns, G1 takes break
            if minute == 75:
                self.activate_teller("G2")
                self.deactivate_teller("G1")
            
            # At 15:15 (90 min in), G1 returns
            if minute == 90:
                self.activate_teller("G1")
        
        print(f"Simulation complete. Total customers: {len(self.customers)}")
        print(f"Served: {len(self.served_customers)}, Still waiting: {len(self.queue)}")
    
    def export_data(self):
        """Export simulation data to files"""
        # Export customers
        customers_df = pd.DataFrame([
            {
                "Customer ID": c["id"],
                "Name": c["name"],
                "Ticket": c["ticket"],
                "Service": c["service"],
                "Arrival Time": c["arrival_time"].strftime("%H:%M:%S"),
                "Service Start": c["service_start"].strftime("%H:%M:%S") if c["service_start"] else None,
                "Service End": c["service_end"].strftime("%H:%M:%S") if c["service_end"] else None,
                "Wait Time (min)": round(c["wait_time"], 2),
                "Service Duration (min)": c["service_duration"],
                "Teller": c["teller_name"],
                "Status": c["status"]
            }
            for c in self.customers
        ])
        customers_df.to_csv("/home/ubuntu/blesaf_analysis/simulation_customers.csv", index=False)
        
        # Export events
        events_df = pd.DataFrame(self.events)
        events_df["time"] = events_df["time"].apply(lambda x: x.strftime("%H:%M:%S"))
        events_df.to_csv("/home/ubuntu/blesaf_analysis/simulation_events.csv", index=False)
        
        # Export snapshots at key demo times
        demo_times = [
            ("14:00", 15),   # Start of demo
            ("14:15", 30),   # Peak building
            ("14:30", 45),   # After G3 activation
            ("14:45", 60),   # G2 break
            ("15:00", 75),   # Staff rotation
            ("15:30", 105)   # Winding down
        ]
        
        snapshots = []
        for time_label, minute in demo_times:
            self.current_time = SIMULATION_START_TIME + timedelta(minutes=minute)
            
            # Reconstruct state at this time
            waiting = [c for c in self.customers 
                      if c["arrival_time"] <= self.current_time 
                      and (c["service_start"] is None or c["service_start"] > self.current_time)]
            
            served = [c for c in self.customers 
                     if c["service_end"] and c["service_end"] <= self.current_time]
            
            being_served = [c for c in self.customers
                           if c["service_start"] and c["service_start"] <= self.current_time
                           and (c["service_end"] is None or c["service_end"] > self.current_time)]
            
            active_tellers_at_time = [e for e in self.events 
                                     if e["time"] <= self.current_time 
                                     and e["type"] == "teller_activated"]
            
            if served:
                avg_wait = sum(c["wait_time"] for c in served) / len(served)
                sla_compliant = sum(1 for c in served if c["wait_time"] <= 15)
                sla_pct = (sla_compliant / len(served)) * 100
            else:
                avg_wait = 0
                sla_pct = 100
            
            snapshot = {
                "time": time_label,
                "queue_length": len(waiting),
                "being_served": len(being_served),
                "total_served": len(served),
                "active_counters": len([t for t in active_tellers_at_time 
                                       if not any(e["type"] == "teller_deactivated" 
                                                 and e["teller_id"] == t["teller_id"] 
                                                 and e["time"] <= self.current_time 
                                                 for e in self.events)]),
                "avg_wait_time": round(avg_wait, 1),
                "sla_compliance": round(sla_pct, 1)
            }
            snapshots.append(snapshot)
        
        snapshots_df = pd.DataFrame(snapshots)
        snapshots_df.to_csv("/home/ubuntu/blesaf_analysis/simulation_snapshots.csv", index=False)
        
        # Export detailed state for 14:15 (key demo moment)
        self.current_time = SIMULATION_START_TIME + timedelta(minutes=30)
        state_14_15 = self.get_current_state()
        
        with open("/home/ubuntu/blesaf_analysis/demo_state_14_15.json", "w") as f:
            json.dump(state_14_15, f, indent=2, default=str)
        
        print("\nData exported successfully:")
        print("- simulation_customers.csv")
        print("- simulation_events.csv")
        print("- simulation_snapshots.csv")
        print("- demo_state_14_15.json")
        
        return customers_df, events_df, snapshots_df

# Run simulation
if __name__ == "__main__":
    simulator = CustomerFlowSimulator()
    simulator.run_simulation()
    customers_df, events_df, snapshots_df = simulator.export_data()
    
    print("\n=== Simulation Summary ===")
    print(f"Total customers: {len(customers_df)}")
    print(f"Completed services: {len(customers_df[customers_df['Status'] == 'completed'])}")
    print(f"Average wait time: {customers_df[customers_df['Status'] == 'completed']['Wait Time (min)'].mean():.1f} min")
    print(f"SLA compliance: {(customers_df[customers_df['Wait Time (min)'] <= 15].shape[0] / len(customers_df[customers_df['Status'] == 'completed']) * 100):.1f}%")
    print("\n=== Key Demo Snapshots ===")
    print(snapshots_df.to_string(index=False))

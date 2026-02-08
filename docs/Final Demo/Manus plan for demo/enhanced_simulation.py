"""
Enhanced BleSaf Customer Flow Simulation
Creates realistic demo scenario with queue buildup and resolution
"""

import random
import json
from datetime import datetime, timedelta
import pandas as pd

# Configuration for realistic demo
SIMULATION_START = datetime.strptime("2024-10-26 14:00", "%Y-%m-%d %H:%M")
DEMO_DURATION = 60  # 60 minutes of simulation

# Services
SERVICES = {
    "Dépôt d'espèces": {"duration": (6, 10), "prefix": "D", "weight": 0.40},
    "Retrait d'espèces": {"duration": (4, 7), "prefix": "R", "weight": 0.25},
    "Consultation": {"duration": (10, 15), "prefix": "C", "weight": 0.15},
    "Relevés de compte": {"duration": (3, 6), "prefix": "R", "weight": 0.12},
    "Virement": {"duration": (7, 12), "prefix": "V", "weight": 0.05},
    "Autres": {"duration": (5, 10), "prefix": "A", "weight": 0.03}
}

# Tellers
TELLERS = {
    "G1": {"name": "Mohamed Sassi", "efficiency": 1.0},
    "G2": {"name": "Leila Hamdi", "efficiency": 0.95},
    "G3": {"name": "Farid Kallel", "efficiency": 1.05},
    "G4": {"name": "Yasmine Mansour", "efficiency": 0.90}
}

# Customer names
FIRST_NAMES = ["Amira", "Mohamed", "Fatma", "Karim", "Leila", "Ahmed", "Salma", "Youssef", 
               "Nadia", "Omar", "Ines", "Hamza", "Mariem", "Tarek", "Sonia", "Rami"]
LAST_NAMES = ["Ben Ali", "Trabelsi", "Gharbi", "Kallel", "Hamdi", "Mansour", "Jebali", 
              "Sassi", "Mejri", "Dridi", "Ayari", "Khedher"]

class EnhancedSimulator:
    def __init__(self):
        self.current_time = SIMULATION_START
        self.customers = []
        self.queue = []
        self.served = []
        self.active_tellers = {}
        self.ticket_counters = {s["prefix"]: 1 for s in SERVICES.values()}
        self.events = []
        self.snapshots = []
        
    def generate_ticket(self, service):
        prefix = SERVICES[service]["prefix"]
        num = self.ticket_counters[prefix]
        self.ticket_counters[prefix] += 1
        return f"{prefix}-{num:03d}"
    
    def add_customer(self, service, offset_seconds=0):
        """Add a customer to the queue"""
        arrival_time = self.current_time + timedelta(seconds=offset_seconds)
        customer = {
            "id": len(self.customers) + 1,
            "name": f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}",
            "ticket": self.generate_ticket(service),
            "service": service,
            "arrival_time": arrival_time,
            "wait_start": arrival_time,
            "service_start": None,
            "service_end": None,
            "teller": None,
            "status": "waiting"
        }
        self.customers.append(customer)
        self.queue.append(customer)
        return customer
    
    def activate_teller(self, teller_id):
        """Activate a teller"""
        if teller_id not in self.active_tellers:
            self.active_tellers[teller_id] = {
                "id": teller_id,
                "name": TELLERS[teller_id]["name"],
                "efficiency": TELLERS[teller_id]["efficiency"],
                "current_customer": None,
                "service_end_time": None,
                "total_served": 0
            }
            self.events.append({
                "time": self.current_time,
                "type": "teller_activated",
                "teller_id": teller_id
            })
    
    def deactivate_teller(self, teller_id):
        """Deactivate a teller (break)"""
        if teller_id in self.active_tellers:
            if self.active_tellers[teller_id]["current_customer"] is None:
                del self.active_tellers[teller_id]
                self.events.append({
                    "time": self.current_time,
                    "type": "teller_deactivated",
                    "teller_id": teller_id
                })
    
    def assign_customers(self):
        """Assign waiting customers to available tellers"""
        for teller in self.active_tellers.values():
            if teller["current_customer"] is None and len(self.queue) > 0:
                customer = self.queue.pop(0)
                
                # Calculate service duration
                min_dur, max_dur = SERVICES[customer["service"]]["duration"]
                duration = random.randint(min_dur, max_dur) / teller["efficiency"]
                
                customer["service_start"] = self.current_time
                customer["service_end"] = self.current_time + timedelta(minutes=duration)
                customer["teller"] = teller["id"]
                customer["status"] = "being_served"
                
                teller["current_customer"] = customer
                teller["service_end_time"] = customer["service_end"]
    
    def complete_services(self):
        """Complete services that have finished"""
        for teller in self.active_tellers.values():
            if teller["current_customer"] and self.current_time >= teller["service_end_time"]:
                customer = teller["current_customer"]
                customer["status"] = "completed"
                self.served.append(customer)
                teller["current_customer"] = None
                teller["total_served"] += 1
    
    def take_snapshot(self, label=""):
        """Take a snapshot of current state"""
        waiting = [c for c in self.customers if c["status"] == "waiting"]
        being_served = [c for c in self.customers if c["status"] == "being_served"]
        
        # Calculate metrics
        if self.served:
            wait_times = [(c["service_start"] - c["wait_start"]).total_seconds() / 60 
                         for c in self.served]
            avg_wait = sum(wait_times) / len(wait_times)
            sla_compliant = sum(1 for w in wait_times if w <= 15)
            sla_pct = (sla_compliant / len(self.served)) * 100
        else:
            avg_wait = 0
            sla_pct = 100
        
        # Service breakdown
        service_breakdown = {}
        for service in SERVICES.keys():
            service_waiting = [c for c in waiting if c["service"] == service]
            if service_waiting:
                service_wait_times = [(self.current_time - c["wait_start"]).total_seconds() / 60 
                                     for c in service_waiting]
                service_breakdown[service] = {
                    "count": len(service_waiting),
                    "avg_wait": round(sum(service_wait_times) / len(service_wait_times), 1)
                }
        
        # Queue velocity (customers arriving vs being served in last 15 min)
        recent_arrivals = [c for c in self.customers 
                          if (self.current_time - c["arrival_time"]).total_seconds() <= 900]
        recent_served = [c for c in self.served 
                        if c["service_end"] and (self.current_time - c["service_end"]).total_seconds() <= 900]
        queue_velocity = (len(recent_arrivals) - len(recent_served)) * 4  # per hour
        
        snapshot = {
            "label": label,
            "time": self.current_time.strftime("%H:%M"),
            "queue_length": len(waiting),
            "being_served": len(being_served),
            "total_served": len(self.served),
            "active_counters": len(self.active_tellers),
            "avg_wait_time": round(avg_wait, 1),
            "sla_compliance": round(sla_pct, 1),
            "queue_velocity": queue_velocity,
            "service_breakdown": service_breakdown,
            "waiting_customers": [
                {
                    "ticket": c["ticket"],
                    "name": c["name"],
                    "service": c["service"],
                    "wait_time": round((self.current_time - c["wait_start"]).total_seconds() / 60, 1)
                }
                for c in waiting
            ],
            "active_tellers": [
                {
                    "id": t["id"],
                    "name": t["name"],
                    "status": "busy" if t["current_customer"] else "available",
                    "current_ticket": t["current_customer"]["ticket"] if t["current_customer"] else None,
                    "total_served": t["total_served"]
                }
                for t in self.active_tellers.values()
            ]
        }
        self.snapshots.append(snapshot)
        return snapshot
    
    def run_demo_scenario(self):
        """Run a realistic demo scenario"""
        print("Running enhanced demo scenario...")
        
        # === MINUTE 0: 14:00 - Demo starts ===
        print("\n14:00 - Demo starts, 2 tellers active")
        self.activate_teller("G1")
        self.activate_teller("G2")
        
        # Add initial customers (already being served)
        c1 = self.add_customer("Consultation")
        c1["status"] = "being_served"
        c1["service_start"] = self.current_time - timedelta(minutes=3)
        c1["service_end"] = self.current_time + timedelta(minutes=7)
        c1["teller"] = "G1"
        self.active_tellers["G1"]["current_customer"] = c1
        self.active_tellers["G1"]["service_end_time"] = c1["service_end"]
        
        c2 = self.add_customer("Retrait d'espèces")
        c2["status"] = "being_served"
        c2["service_start"] = self.current_time - timedelta(minutes=2)
        c2["service_end"] = self.current_time + timedelta(minutes=3)
        c2["teller"] = "G2"
        self.active_tellers["G2"]["current_customer"] = c2
        self.active_tellers["G2"]["service_end_time"] = c2["service_end"]
        
        self.queue.remove(c1)
        self.queue.remove(c2)
        
        # Add 3 waiting customers
        self.add_customer("Dépôt d'espèces")
        self.add_customer("Dépôt d'espèces", 30)
        self.add_customer("Relevés de compte", 45)
        
        self.take_snapshot("Demo Start - 14:00")
        
        # === MINUTES 1-10: Steady arrivals, queue builds ===
        for minute in range(1, 11):
            self.current_time = SIMULATION_START + timedelta(minutes=minute)
            self.complete_services()
            
            # Add 1-2 customers per minute (peak hour)
            if random.random() < 0.7:
                services = list(SERVICES.keys())
                weights = [SERVICES[s]["weight"] for s in services]
                service = random.choices(services, weights=weights)[0]
                self.add_customer(service)
            
            if random.random() < 0.4:
                services = list(SERVICES.keys())
                weights = [SERVICES[s]["weight"] for s in services]
                service = random.choices(services, weights=weights)[0]
                self.add_customer(service, random.randint(15, 45))
            
            self.assign_customers()
        
        # === MINUTE 10: 14:10 - Queue building up ===
        self.current_time = SIMULATION_START + timedelta(minutes=10)
        self.complete_services()
        self.assign_customers()
        print(f"\n14:10 - Queue: {len(self.queue)}, Being served: {sum(1 for c in self.customers if c['status'] == 'being_served')}")
        self.take_snapshot("Queue Building - 14:10")
        
        # === MINUTES 11-15: More arrivals, queue stress ===
        for minute in range(11, 16):
            self.current_time = SIMULATION_START + timedelta(minutes=minute)
            self.complete_services()
            
            # Heavy arrivals
            for _ in range(random.randint(1, 3)):
                services = list(SERVICES.keys())
                weights = [SERVICES[s]["weight"] for s in services]
                service = random.choices(services, weights=weights)[0]
                self.add_customer(service, random.randint(0, 50))
            
            self.assign_customers()
        
        # === MINUTE 15: 14:15 - Critical moment (AI recommendation point) ===
        self.current_time = SIMULATION_START + timedelta(minutes=15)
        self.complete_services()
        self.assign_customers()
        print(f"\n14:15 - CRITICAL: Queue: {len(self.queue)}, Being served: {sum(1 for c in self.customers if c['status'] == 'being_served')}")
        snapshot_14_15 = self.take_snapshot("Critical Moment - 14:15 (Before Action)")
        
        # === MINUTE 16: AI recommendation executed - G3 activated ===
        self.current_time = SIMULATION_START + timedelta(minutes=16)
        print("\n14:16 - ACTION: Activating G3 (AI recommendation)")
        self.activate_teller("G3")
        self.complete_services()
        self.assign_customers()
        
        # === MINUTES 17-30: Resolution ===
        for minute in range(17, 31):
            self.current_time = SIMULATION_START + timedelta(minutes=minute)
            self.complete_services()
            
            # Moderate arrivals
            if random.random() < 0.5:
                services = list(SERVICES.keys())
                weights = [SERVICES[s]["weight"] for s in services]
                service = random.choices(services, weights=weights)[0]
                self.add_customer(service)
            
            self.assign_customers()
        
        # === MINUTE 30: 14:30 - After resolution ===
        self.current_time = SIMULATION_START + timedelta(minutes=30)
        self.complete_services()
        self.assign_customers()
        print(f"\n14:30 - RESOLVED: Queue: {len(self.queue)}, Being served: {sum(1 for c in self.customers if c['status'] == 'being_served')}")
        self.take_snapshot("After Resolution - 14:30")
        
        # === MINUTES 31-45: Steady state ===
        for minute in range(31, 46):
            self.current_time = SIMULATION_START + timedelta(minutes=minute)
            self.complete_services()
            
            if random.random() < 0.4:
                services = list(SERVICES.keys())
                weights = [SERVICES[s]["weight"] for s in services]
                service = random.choices(services, weights=weights)[0]
                self.add_customer(service)
            
            self.assign_customers()
        
        # === MINUTE 45: 14:45 - G2 takes break ===
        self.current_time = SIMULATION_START + timedelta(minutes=45)
        print("\n14:45 - G2 takes break")
        self.complete_services()
        self.assign_customers()
        self.deactivate_teller("G2")
        self.take_snapshot("G2 Break - 14:45")
        
        # === MINUTE 60: 15:00 - End of demo ===
        self.current_time = SIMULATION_START + timedelta(minutes=60)
        self.complete_services()
        self.assign_customers()
        print(f"\n15:00 - Demo end: Total served: {len(self.served)}")
        self.take_snapshot("Demo End - 15:00")
        
        print(f"\n=== Simulation Complete ===")
        print(f"Total customers: {len(self.customers)}")
        print(f"Served: {len(self.served)}")
        print(f"Still waiting: {len(self.queue)}")
    
    def export_data(self):
        """Export all data"""
        # Export snapshots
        snapshots_df = pd.DataFrame([
            {
                "Label": s["label"],
                "Time": s["time"],
                "Queue": s["queue_length"],
                "Being Served": s["being_served"],
                "Total Served": s["total_served"],
                "Active Counters": s["active_counters"],
                "Avg Wait (min)": s["avg_wait_time"],
                "SLA %": s["sla_compliance"],
                "Queue Velocity": s["queue_velocity"]
            }
            for s in self.snapshots
        ])
        snapshots_df.to_csv("/home/ubuntu/blesaf_analysis/demo_snapshots.csv", index=False)
        
        # Export detailed state at 14:15
        snapshot_14_15 = next(s for s in self.snapshots if "14:15" in s["label"])
        with open("/home/ubuntu/blesaf_analysis/demo_state_14_15_detailed.json", "w") as f:
            json.dump(snapshot_14_15, f, indent=2, default=str)
        
        # Export all customers
        customers_df = pd.DataFrame([
            {
                "ID": c["id"],
                "Name": c["name"],
                "Ticket": c["ticket"],
                "Service": c["service"],
                "Arrival": c["arrival_time"].strftime("%H:%M:%S"),
                "Service Start": c["service_start"].strftime("%H:%M:%S") if c["service_start"] else "",
                "Service End": c["service_end"].strftime("%H:%M:%S") if c["service_end"] else "",
                "Wait (min)": round((c["service_start"] - c["wait_start"]).total_seconds() / 60, 1) if c["service_start"] else "",
                "Teller": c["teller"] if c["teller"] else "",
                "Status": c["status"]
            }
            for c in self.customers
        ])
        customers_df.to_csv("/home/ubuntu/blesaf_analysis/demo_customers.csv", index=False)
        
        print("\n=== Data Exported ===")
        print("- demo_snapshots.csv")
        print("- demo_state_14_15_detailed.json")
        print("- demo_customers.csv")
        
        return snapshots_df

# Run simulation
if __name__ == "__main__":
    sim = EnhancedSimulator()
    sim.run_demo_scenario()
    snapshots = sim.export_data()
    
    print("\n=== Key Snapshots ===")
    print(snapshots.to_string(index=False))

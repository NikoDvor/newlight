import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, CalendarPlus, Eye } from "lucide-react";

interface ClientOption {
  id: string;
  business_name: string;
}

export default function AdminStaffCalendars() {
  const [staffCalendars, setStaffCalendars] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [calRes, clientRes] = await Promise.all([
        supabase
          .from("calendars")
          .select("*, workers(id, full_name, role_title, department, status, client_id)")
          .eq("calendar_type", "staff")
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("clients")
          .select("id, business_name")
          .order("business_name"),
      ]);
      setStaffCalendars(calRes.data || []);
      setClients(clientRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    


      


        

Staff Calendars


        


          All employee personal calendars across every client workspace
        


      


      {loading ? (
        
          Loading calendars...
        
      ) : staffCalendars.length === 0 ? (
        
          


            
            


              

No staff calendars yet


              


                Staff calendars are created automatically when workers are added in Workforce.
              


            


          


        
      ) : (
        
          


            
                  {["Employee", "Role", "Department", "Client Workspace", "Calendar", "Status", "Actions"].map(h => (
                    
                  ))}
                
                {staffCalendars.map((cal, i) => {
                  const worker = (cal.workers as any) || {};
                  const clientName = clients.find(c => c.id === worker.client_id)?.business_name || "—";
                  return (
                    
                      
                  );
                })}
              


              
                
                      {h}
                    
              
              
                        


                          


                            {(worker.full_name || "?").substring(0, 2).toUpperCase()}
                          


                          
                            {worker.full_name || "Unknown"}
                          
                        


                      
                      {worker.role_title || "—"}
                      {worker.department || "—"}
                      {clientName}
                      
                        


                          


                          {cal.calendar_name}
                        


                      


                      
                        
                          {worker.status || "—"}
                        
                      
                      
                        


                           window.location.assign(`/calendar-management/${cal.id}`)}
                            className="text-[10px] px-2 py-1 rounded-lg bg-white/[0.06] text-white/60 hover:bg-white/[0.1] hover:text-white transition-colors flex items-center gap-1"
                          >
                             View
                          
                           window.location.assign(`/book/${cal.id}`)}
                            className="text-[10px] px-2 py-1 rounded-lg bg-[hsla(211,96%,60%,.12)] text-[hsl(var(--nl-sky))] hover:bg-[hsla(211,96%,60%,.2)] transition-colors flex items-center gap-1"
                          >
                             Book
                          
                        


                      
                    
            


          


        
      )}
    


  );
}

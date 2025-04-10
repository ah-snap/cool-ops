import React from "react";
import 'react-data-grid/lib/styles.css';
import ProjectionChart from "./ProjectionChart";
import { addMonths } from 'date-fns';

function DateLinesChart({dateLines, previousMonthDateLines, goal, breakEven}) {
    
    if (!dateLines) return null;

    const data = [
        {
          label: 'Projected Nonstatic Total',
          data: dateLines.map((date, _) => ({
            x: date.date,
            y: date.projectedNonStaticTotal
          })),
          color: "#4472C4"
        },
        {
            label: "Nonstatic Total",
            data: dateLines.map((date, _) => ({
                x: date.date,
                y: date.nonstaticTotal
            })),
            color: "#ED7D31"
        },        
        {
            label: "Goal",
            data: dateLines.map((date, _) => ({
                x: date.date,
                y: goal || date.goal
            })),
            color: "#FFC000"
        },
        {
            label: "Break Even",
            data: dateLines.map((date, _) => ({
                x: date.date,
                y: breakEven || date.breakEven
            })),
            color: "#A5A5A5"
        },
        {
            label: "Average Per Diem",
            data: dateLines.map((date, _) => ({
                x: date.date,
                y: date.avgPerDiem
            })),
            color: "#92D050",
            secondaryAxisId: "2"
        },
        {
          label: "Per Diem",
          data: dateLines.map((date, _) => ({
              x: date.date,
              y: date.perDiem
          })),
          color: "#92D05022",
          secondaryAxisId: "2"
        },
        {
            label: "Running Proration",
            data: dateLines.map((date, _) => ({
                x: date.date,
                y: date.prorated
            })),
            color: "#ED7D31",
            strokeDasharray: "2 6"
        },
        {
            label: "Previous Month",
            data: previousMonthDateLines.map((date, _) => ({ 
                x: addMonths(date.date, 1),
                y: date.nonstaticTotal
            })),
            color: "#FF000066",
            strokeDasharray: "2 6"
        }
      ]


    return <div style={{margin: "2em"}}>
        <ProjectionChart data={data} date={dateLines[0].date} style={{height:"100%"}} />
    </div>
}

export default DateLinesChart;

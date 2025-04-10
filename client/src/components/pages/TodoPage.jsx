import React from "react";
import "../../stylesheets/todo.css"


function TodoPage() {
  
  return <div className="todoContainer">
  <h1>Pure Client Side Todos</h1>
  <ul>
      <li>Make Transactions Page easier to look at</li>
      <li>Unknown category page?</li>
      <li>Series projection improvements
        <ul>
          <li>Advanced frequency overriding (one day after second check in month)</li>
        </ul>
      </li>
      
      <li>
        Category Detail Page, Target Analysis based on previous spending
      </li>
  </ul>

</div>;
}

export default TodoPage;

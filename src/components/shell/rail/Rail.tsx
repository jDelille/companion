// left nav column

import styles from './Rail.module.scss';
import RailItem from './RailItem';

const Rail = () => {
  
  const linkItems = [
    {id: 1, abbrv: "TO", label: "Today"},
    {id: 2, abbrv: "PE", label: "People"},
    {id: 3, abbrv: "OP", label: "Ops"},
    {id: 4, abbrv: "MA", label: "MA"},
    {id: 5, abbrv: "RE", label: "Revenue"},
    {id: 6, abbrv: "EN", label: "Engage"},
    {id: 7, abbrv: "IN", label: "Intel"},
    {id: 8, abbrv: "PL", label: "Platform"}
  ]

  return (
    <div className={styles.rail}>
      <div className={styles.rail__logo}></div>
      <ul className={styles.rail__links}>
        {linkItems.map((item, index) => (
          <RailItem key={item.id} item={item} isActive={index == 2}/>
        ))}
      </ul>

      <div className={styles.rail__user}>
        <p>MK</p>
      </div>
    </div>
  )
}

export default Rail
# G-CyberRPcore - Agent Memory & Context Guide (دليل المشروع والذاكرة)

> **Important**: هذا الملف مخصص لك كوكيل ذكاء اصطناعي (Agent) في أي محادثة جديدة لتتذكر فوراً كل ما تم إنجازه، البنية المعمارية الكاملة، ومسار العمل المستقبلي لمشروع **G-CyberRPcore**.

---

## 🎯 1. الرؤية والهدف الأساسي (The Master Vision)

- **اسم المشروع:** **`G-CyberRPcore`**
- **الهدف:** بناء وتطوير المنظومة وإطار العمل القياسي الأول والأضخم عالمياً لطور الحياة الواقعية (Roleplay) على لعبة **Cyberpunk 2077** عبر منصة **CyberMP**.
- **النموذج المرجعي:** محاكاة هندسة وفلسفة **QBCore** (المنظومة الأشهر في FiveM) وتطويعها لبيئة نايت سيتي وأكواد REDengine.
- **المنظمة الرسمية على GitHub:** [https://github.com/G-CyberRPcore](https://github.com/G-CyberRPcore)
  - مستودع بروفايل المنظمة: [`G-CyberRPcore/.github`](https://github.com/G-CyberRPcore/.github)
  - مستودع النواة الأساسية: [`G-CyberRPcore/G-CyberRPcore`](https://github.com/G-CyberRPcore/G-CyberRPcore)

---

## 📁 2. المسارات المهمة على هذا الجهاز (Local File Paths)

| المسار | الوصف |
| :--- | :--- |
| `D:\cybermpserver` | خادم CyberMP المحلي التنفيذي (Port 2077 TCP/UDP، الإصدار v4.0.4-beta.1). |
| `D:\G-CyberRPcore` | مستودع Git الأساسي لنواة المشروع المربوط مباشرة بـ GitHub. |
| `E:\ProgramData\cybermp` | مشغل CyberMP Launcher للعبة العميل. |
| `E:\SteamLibrary\steamapps\common\Cyberpunk 2077` | مجلد لعبة Cyberpunk 2077 الأصلي. |
| `D:\G-CyberRPcore\assets\logo.svg` و `logo.jpg` | الشعار الرسمي ثلاثي الأبعاد وهوية G-CyberRPcore البصرية. |

> [!WARNING]
> **ملاحظة تقنية حرجة بخصوص مشغل CyberMP:**
> ملف `E:\ProgramData\cybermp\resources\mp\prelauncher.exe` هو المسؤول عن مصافحة الاتصال. يقوم Windows Defender أحياناً بحجزه كاشتباه خاطئ (False Positive). تم استعادته ويجب التأكد دائماً من وجود استثناء (Exclusion) للمجلد `E:\ProgramData\cybermp` في Windows Defender.

---

## 🏛️ 3. البنية المعمارية للنواة (`G-CyberRPcore Architecture`)

النواة مبنية بنمط الكائن المشترك الموحد `global.G_CyberCore` ومكونة من:

### أ. محرك النواة (`core/`):
1. **`core/index.js`**: نقطة الدخول والمتحكم العام (Singleton) الذي يربط اللاعبين بالأحداث وقواعد البيانات.
2. **`core/player.js`**: كائن اللاعب المتكامل `PlayerData`:
   - `citizenid`: هوية المواطن الفريدة (مثل `NC-481924`).
   - `charinfo`: الاسم الأول والأخير، تاريخ الميلاد، الجنس، والقصة.
   - `money`: كاش (`cash`)، بنك (`bank`)، وعملات مشفرة (`crypto`).
   - `job`: الوظيفة، الرتبة، الراتب، وحالة مباشرة العمل (`onDuty`).
   - `gang`: العصابة (Valentinos, Maelstrom, etc.) ورتبتها.
   - `metadata`: الجوع (`hunger`)، العطش (`thirst`)، الدرع (`armor`)، الإجهاد والتلوث السيبراني (`stress` / `cyberpsychosis`).
   - `inventory`: مصفوفة العناصر وخانات الحقيبة (بحد أقصى للوزن 120 كجم).
   - دوال فورية: `AddMoney`, `RemoveMoney`, `SetJob`, `SetJobDuty`, `AddItem`, `RemoveItem`, `SetMetaData`, `SyncHUD`.
3. **`core/callbacks.js`**: نظام استدعاءات الخادم والعميل غير المتزامنة (`CreateCallback` / `TriggerCallback`).
4. **`core/commands.js`**: تسجيل الأوامر مع فحص الصلاحيات الشجرية (`admin`, `mod`, `user`).
5. **`core/database.js`**: محرك قاعدة البيانات التخزيني التلقائي.

### ب. السجلات المشتركة العملاقة (`shared/`):
* **`shared/items.js`**: أكثر من 150 عنصراً لـ Cyberpunk (MaxDoc, Bounce Back, Cyberdecks, Sandevistan, Kiroshi Optics, الأسلحة والذخائر، والأطعمة والمشروبات).
* **`shared/jobs.js`**: وظائف بالرتب والرواتب (NCPD, Trauma Team, Ripperdoc, Mechanics, Delamain, Fixers, Arasaka).
* **`shared/gangs.js`**: عصابات Night City ومناطق نفوذها.
* **`shared/vehicles.js`**: أكثر من 80 مركبة بأكواد TweakDB IDs ومظاهر CName وسعات الصناديق.

---

## 🧩 4. حالة الموديولات البرمجية (Modules Status)

| الموديول | الحالة | الوصف |
| :--- | :--- | :--- |
| **`g-cyber-hud`** | ✅ مكتمل ومثبت ومرفوع | HUD عصري بأسلوب Cyberpunk 2077 يتضمن دوال الحالة الدائرية، مؤشر صوت حي بموجات متحركة (Waveform)، عداد سرعة هولوغرافي للمركبات مع شريط RPM ومؤشر غيارات وحزام أمان، قائمة إعدادات `/hudmenu`، طور سينمائي `/cinematic`، وأصوات نيونية عبر Web Audio API. |
| **`chat`** | ✅ مكتمل ومثبت | نظام الشات المحاكي للواقع مع المحادثة المكانية (15م) وأوامر `/me`, `/do`, `/ooc`, `/shout`, `/whisper`, `/tweet`, `/dispatch`. |
| **`g-cyber-inventory`** | ⏳ الموديول القادم | حقيبة بالشبكة والمربعات (Grid Inventory) مع السحب والإفلات (Drag & Drop)، وأوزان الأسلحة وخانات السايبروير وأزرار الوصول السريع 1-5. |
| **`g-cyber-banking`** | ⏳ قادم | نظام بنوك وصرافات آلية متطور مع بطاقات ائتمان وحسابات مشتركة للشركات. |
| **`g-cyber-garages`** | ⏳ قادم | كراجات تفاعلية ومفاتيح أمان `/lock` مع حجز المركبات وتعديلها. |
| **`g-cyber-housing`** | ⏳ قادم | شقق بالأبعاد الافتراضية وخزائن خاصة ودعوات زوار. |
| **`g-cyber-police` / `trauma`**| ⏳ قادم | غرف عمليات MDT للشرطة ودفتر مخالفات وكلبشات، وإنعاش طبي ميداني للإسعاف. |

---

## ⚙️ 5. قواعد وتعليمات تقنية للتطوير (Developer Guidelines)

1. **التعامل مع بيئة CyberMP Executable:**
   - السيرفر يعمل بنواة Node.js v22 مدمجة عبر `libnode.dll`.
   - في ملفات البداية (`server.js` الرئيسية للمورد)، احرص دائماً على فحص تصدير الموديل:
     ```javascript
     if (typeof module !== 'undefined') { module.exports = G_CyberCore; }
     ```
     واعتمد دائماً على الكائن العام `global.G_CyberCore`.
2. **المزامنة مع GitHub:**
   - عند إجراء أي تعديل أو إضافة موديول جديد في `D:\G-CyberRPcore`، قم بالدفع فوراً للمستودع عبر:
     ```bash
     git add .
     git commit -m "feat: ..."
     git push origin main
     ```
3. **تطبيق التعديلات على السيرفر التنفيذي:**
   - انسخ دائماً الموديول الجديد إلى `D:\cybermpserver\resources\` وأضفه إلى قائمة `resources` في `D:\cybermpserver\server.toml`.
   - يمكن تشغيل السيرفر واختباره عبر ملف [`start-server.bat`](file:///D:/cybermpserver/start-server.bat).

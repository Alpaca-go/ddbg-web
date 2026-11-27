# 英雄技能效果词典迁移清单

以 `ba652bcb` 的 378 张实体为基线，42 张已迁移，336 张分八组。每行按 I、II、III 级列出 canonical ID，按英雄区分同名技能。复合直攻按位移、条件伤害或忽略防护、状态或自身效果、基础伤害的顺序归组。有任一级包含额外效果时，整套按该效果归组，例如 Flashing Daggers II、III 的减益。

## 已迁移直攻（42 张）

| 技能               | I                          | II                         | III                        |
| ------------------ | -------------------------- | -------------------------- | -------------------------- |
| Smite              | `hero_skill:core:h01:p001` | `hero_skill:core:h01:p002` | `hero_skill:core:h01:p003` |
| Zealous Accusation | `hero_skill:core:h01:p004` | `hero_skill:core:h01:p005` | `hero_skill:core:h01:p006` |
| Stunning Blow      | `hero_skill:core:h01:p007` | `hero_skill:core:h01:p008` | `hero_skill:core:h01:p009` |
| Holy Lance         | `hero_skill:core:h01:p016` | `hero_skill:core:h01:p017` | `hero_skill:core:h01:p018` |
| If It Bleeds       | `hero_skill:core:h02:p031` | `hero_skill:core:h02:p032` | `hero_skill:core:h02:p033` |
| Breakthrough       | `hero_skill:core:h02:p034` | `hero_skill:core:h02:p035` | `hero_skill:core:h02:p036` |
| Caltrops           | `hero_skill:core:h03:p061` | `hero_skill:core:h03:p062` | `hero_skill:core:h03:p063` |
| Open Vein          | `hero_skill:core:h04:p082` | `hero_skill:core:h04:p083` | `hero_skill:core:h04:p084` |
| Harvest            | `hero_skill:core:h06:p109` | `hero_skill:core:h06:p110` | `hero_skill:core:h06:p111` |
| Finale             | `hero_skill:core:h06:p112` | `hero_skill:core:h06:p113` | `hero_skill:core:h06:p114` |
| Slice Off          | `hero_skill:core:h06:p124` | `hero_skill:core:h06:p125` | `hero_skill:core:h06:p126` |
| Noxious Blast      | `hero_skill:core:h07:p127` | `hero_skill:core:h07:p128` | `hero_skill:core:h07:p129` |
| Plague Grenade     | `hero_skill:core:h07:p130` | `hero_skill:core:h07:p131` | `hero_skill:core:h07:p132` |
| Incision           | `hero_skill:core:h07:p136` | `hero_skill:core:h07:p137` | `hero_skill:core:h07:p138` |

## 1 组 基础直攻（21 张）

21 张均已录入对应英雄的 `entries.directAttack`。本组无待裁定停点。

| 技能         | I                             | II                            | III                           |
| ------------ | ----------------------------- | ----------------------------- | ----------------------------- |
| Wicked Hack  | `hero_skill:core:h02:p022`    | `hero_skill:core:h02:p023`    | `hero_skill:core:h02:p024`    |
| Iron Swan    | `hero_skill:core:h02:p025`    | `hero_skill:core:h02:p026`    | `hero_skill:core:h02:p027`    |
| Wicked Slice | `hero_skill:core:h04:p064`    | `hero_skill:core:h04:p065`    | `hero_skill:core:h04:p066`    |
| Chop         | `hero_skill:warrens:h14:p274` | `hero_skill:warrens:h14:p275` | `hero_skill:warrens:h14:p276` |
| Hew          | `hero_skill:warrens:h14:p277` | `hero_skill:warrens:h14:p278` | `hero_skill:warrens:h14:p279` |
| Nervous Stab | `hero_skill:warrens:h15:p295` | `hero_skill:warrens:h15:p296` | `hero_skill:warrens:h15:p297` |
| Crush        | `hero_skill:cove:h12:p232`    | `hero_skill:cove:h12:p233`    | `hero_skill:cove:h12:p234`    |

## 2 组 附带状态或自身效果的直攻（69 张）

其中 66 张已录入。Exsanguinate I、II、III 的停点是 Q-174 核准的同行自身治疗 3／5／7。用受伤行动者逐级核对后，旧路径能结算状态，但 `readSelfHeal` 跳过同一行的治疗。迁入核准治疗会改变生命状态、事件和历史日志回放，因此三个等级保留旧路径，待确定旧档的兼容口径后一起处理。

| 技能                 | I                               | II                              | III                             |
| -------------------- | ------------------------------- | ------------------------------- | ------------------------------- |
| Bleed Out            | `hero_skill:core:h02:p040`      | `hero_skill:core:h02:p041`      | `hero_skill:core:h02:p042`      |
| Grapeshot Blast      | `hero_skill:core:h04:p073`      | `hero_skill:core:h04:p074`      | `hero_skill:core:h04:p075`      |
| Tracking Shot        | `hero_skill:core:h04:p076`      | `hero_skill:core:h04:p077`      | `hero_skill:core:h04:p078`      |
| Judgement            | `hero_skill:core:h05:p088`      | `hero_skill:core:h05:p089`      | `hero_skill:core:h05:p090`      |
| Dazzling Light       | `hero_skill:core:h05:p091`      | `hero_skill:core:h05:p092`      | `hero_skill:core:h05:p093`      |
| Illumination         | `hero_skill:core:h05:p100`      | `hero_skill:core:h05:p101`      | `hero_skill:core:h05:p102`      |
| Suppressive Fire     | `hero_skill:core:h08:p151`      | `hero_skill:core:h08:p152`      | `hero_skill:core:h08:p153`      |
| Flashing Daggers     | `hero_skill:core:h09:p175`      | `hero_skill:core:h09:p176`      | `hero_skill:core:h09:p177`      |
| Poison Dart          | `hero_skill:core:h09:p184`      | `hero_skill:core:h09:p185`      | `hero_skill:core:h09:p186`      |
| Weakening Curse      | `hero_skill:core:h10:p196`      | `hero_skill:core:h10:p197`      | `hero_skill:core:h10:p198`      |
| Vulnerability Hex    | `hero_skill:core:h10:p202`      | `hero_skill:core:h10:p203`      | `hero_skill:core:h10:p204`      |
| Hands from the Abyss | `hero_skill:core:h10:p205`      | `hero_skill:core:h10:p206`      | `hero_skill:core:h10:p207`      |
| Manacles             | `hero_skill:core:h11:p211`      | `hero_skill:core:h11:p212`      | `hero_skill:core:h11:p213`      |
| Beast’s Bile         | `hero_skill:core:h11:p214`      | `hero_skill:core:h11:p215`      | `hero_skill:core:h11:p216`      |
| Rake                 | `hero_skill:core:h11:p223`      | `hero_skill:core:h11:p224`      | `hero_skill:core:h11:p225`      |
| Rage                 | `hero_skill:core:h11:p226`      | `hero_skill:core:h11:p227`      | `hero_skill:core:h11:p228`      |
| Festering Vapours    | `hero_skill:warrens:h15:p298`   | `hero_skill:warrens:h15:p299`   | `hero_skill:warrens:h15:p300`   |
| Retribution          | `hero_skill:cove:h12:p244`      | `hero_skill:cove:h12:p245`      | `hero_skill:cove:h12:p246`      |
| Exsanguinate         | `hero_skill:cove:h13:p259`      | `hero_skill:cove:h13:p260`      | `hero_skill:cove:h13:p261`      |
| Hound’s Rush         | `hero_skill:weald:h17:p337`     | `hero_skill:weald:h17:p338`     | `hero_skill:weald:h17:p339`     |
| Hound’s Harry        | `hero_skill:weald:h17:p340`     | `hero_skill:weald:h17:p341`     | `hero_skill:weald:h17:p342`     |
| Blackjack            | `hero_skill:weald:h17:p355`     | `hero_skill:weald:h17:p356`     | `hero_skill:weald:h17:p357`     |
| Smokescreen          | `hero_skill:musketeer:h18:p361` | `hero_skill:musketeer:h18:p362` | `hero_skill:musketeer:h18:p363` |

## 3 组 条件伤害或忽略防护的直攻（45 张）

45 张已录入并沿用原比较顺序。本组无新增待裁定停点。

| 技能              | I                               | II                              | III                             |
| ----------------- | ------------------------------- | ------------------------------- | ------------------------------- |
| Collect Bounty    | `hero_skill:core:h03:p043`      | `hero_skill:core:h03:p044`      | `hero_skill:core:h03:p045`      |
| Finish Him        | `hero_skill:core:h03:p058`      | `hero_skill:core:h03:p059`      | `hero_skill:core:h03:p060`      |
| Pistol Shot       | `hero_skill:core:h04:p067`      | `hero_skill:core:h04:p068`      | `hero_skill:core:h04:p069`      |
| Mace Bash         | `hero_skill:core:h05:p085`      | `hero_skill:core:h05:p086`      | `hero_skill:core:h05:p087`      |
| Hand of Light     | `hero_skill:core:h05:p103`      | `hero_skill:core:h05:p104`      | `hero_skill:core:h05:p105`      |
| Sniper Shot       | `hero_skill:core:h08:p148`      | `hero_skill:core:h08:p149`      | `hero_skill:core:h08:p150`      |
| Pick to the Face  | `hero_skill:core:h09:p169`      | `hero_skill:core:h09:p170`      | `hero_skill:core:h09:p171`      |
| Throw Dagger      | `hero_skill:core:h09:p181`      | `hero_skill:core:h09:p182`      | `hero_skill:core:h09:p183`      |
| Sacrificial Stab  | `hero_skill:core:h10:p190`      | `hero_skill:core:h10:p191`      | `hero_skill:core:h10:p192`      |
| Abyssal Artillery | `hero_skill:core:h10:p193`      | `hero_skill:core:h10:p194`      | `hero_skill:core:h10:p195`      |
| Intimidate        | `hero_skill:warrens:h14:p292`   | `hero_skill:warrens:h14:p293`   | `hero_skill:warrens:h14:p294`   |
| Punish            | `hero_skill:cove:h13:p253`      | `hero_skill:cove:h13:p254`      | `hero_skill:cove:h13:p255`      |
| Rain of Sorrows   | `hero_skill:cove:h13:p256`      | `hero_skill:cove:h13:p257`      | `hero_skill:cove:h13:p258`      |
| Captivate         | `hero_skill:weald:h16:p331`     | `hero_skill:weald:h16:p332`     | `hero_skill:weald:h16:p333`     |
| Aimed Shot        | `hero_skill:musketeer:h18:p358` | `hero_skill:musketeer:h18:p359` | `hero_skill:musketeer:h18:p360` |

## 4 组 附带位移的直攻（57 张）

| 技能              | I                               | II                              | III                             |
| ----------------- | ------------------------------- | ------------------------------- | ------------------------------- |
| Come Hither       | `hero_skill:core:h03:p049`      | `hero_skill:core:h03:p050`      | `hero_skill:core:h03:p051`      |
| Uppercut          | `hero_skill:core:h03:p052`      | `hero_skill:core:h03:p053`      | `hero_skill:core:h03:p054`      |
| Point Blank Shot  | `hero_skill:core:h04:p070`      | `hero_skill:core:h04:p071`      | `hero_skill:core:h04:p072`      |
| Duelist’s Advance | `hero_skill:core:h04:p079`      | `hero_skill:core:h04:p080`      | `hero_skill:core:h04:p081`      |
| Dirk Stab         | `hero_skill:core:h06:p106`      | `hero_skill:core:h06:p107`      | `hero_skill:core:h06:p108`      |
| Bola              | `hero_skill:core:h08:p157`      | `hero_skill:core:h08:p158`      | `hero_skill:core:h08:p159`      |
| Blindfire         | `hero_skill:core:h08:p160`      | `hero_skill:core:h08:p161`      | `hero_skill:core:h08:p162`      |
| Lunge             | `hero_skill:core:h09:p172`      | `hero_skill:core:h09:p173`      | `hero_skill:core:h09:p174`      |
| Daemon’s Pull     | `hero_skill:core:h10:p208`      | `hero_skill:core:h10:p209`      | `hero_skill:core:h10:p210`      |
| Slam              | `hero_skill:core:h11:p229`      | `hero_skill:core:h11:p230`      | `hero_skill:core:h11:p231`      |
| Purge             | `hero_skill:warrens:h14:p280`   | `hero_skill:warrens:h14:p281`   | `hero_skill:warrens:h14:p282`   |
| Rampart           | `hero_skill:cove:h12:p235`      | `hero_skill:cove:h12:p236`      | `hero_skill:cove:h12:p237`      |
| Pierce            | `hero_skill:weald:h16:p316`     | `hero_skill:weald:h16:p317`     | `hero_skill:weald:h16:p318`     |
| Puncture          | `hero_skill:weald:h16:p319`     | `hero_skill:weald:h16:p320`     | `hero_skill:weald:h16:p321`     |
| Adder’s Kiss      | `hero_skill:weald:h16:p322`     | `hero_skill:weald:h16:p323`     | `hero_skill:weald:h16:p324`     |
| Impale            | `hero_skill:weald:h16:p325`     | `hero_skill:weald:h16:p326`     | `hero_skill:weald:h16:p327`     |
| Expose            | `hero_skill:weald:h16:p328`     | `hero_skill:weald:h16:p329`     | `hero_skill:weald:h16:p330`     |
| Buckshot          | `hero_skill:musketeer:h18:p367` | `hero_skill:musketeer:h18:p368` | `hero_skill:musketeer:h18:p369` |
| Sidearm           | `hero_skill:musketeer:h18:p370` | `hero_skill:musketeer:h18:p371` | `hero_skill:musketeer:h18:p372` |

## 5 组 治疗与减压（54 张）

| 技能                 | I                               | II                              | III                             |
| -------------------- | ------------------------------- | ------------------------------- | ------------------------------- |
| Battle Heal          | `hero_skill:core:h01:p013`      | `hero_skill:core:h01:p014`      | `hero_skill:core:h01:p015`      |
| Inspiring Cry        | `hero_skill:core:h01:p019`      | `hero_skill:core:h01:p020`      | `hero_skill:core:h01:p021`      |
| Divine Grace         | `hero_skill:core:h05:p094`      | `hero_skill:core:h05:p095`      | `hero_skill:core:h05:p096`      |
| Divine Comfort       | `hero_skill:core:h05:p097`      | `hero_skill:core:h05:p098`      | `hero_skill:core:h05:p099`      |
| Inspiring Tune       | `hero_skill:core:h06:p121`      | `hero_skill:core:h06:p122`      | `hero_skill:core:h06:p123`      |
| Battlefield Medicine | `hero_skill:core:h07:p139`      | `hero_skill:core:h07:p140`      | `hero_skill:core:h07:p141`      |
| Battlefield Bandage  | `hero_skill:core:h08:p163`      | `hero_skill:core:h08:p164`      | `hero_skill:core:h08:p165`      |
| Wyrd Reconstruction  | `hero_skill:core:h10:p199`      | `hero_skill:core:h10:p200`      | `hero_skill:core:h10:p201`      |
| Absolution           | `hero_skill:core:h11:p217`      | `hero_skill:core:h11:p218`      | `hero_skill:core:h11:p219`      |
| Solemnity            | `hero_skill:warrens:h14:p289`   | `hero_skill:warrens:h14:p290`   | `hero_skill:warrens:h14:p291`   |
| Fortifying Vapours   | `hero_skill:warrens:h15:p307`   | `hero_skill:warrens:h15:p308`   | `hero_skill:warrens:h15:p309`   |
| Bolster              | `hero_skill:cove:h12:p250`      | `hero_skill:cove:h12:p251`      | `hero_skill:cove:h12:p252`      |
| Reclaim              | `hero_skill:cove:h13:p262`      | `hero_skill:cove:h13:p263`      | `hero_skill:cove:h13:p264`      |
| Redeem               | `hero_skill:cove:h13:p265`      | `hero_skill:cove:h13:p266`      | `hero_skill:cove:h13:p267`      |
| Endure               | `hero_skill:cove:h13:p268`      | `hero_skill:cove:h13:p269`      | `hero_skill:cove:h13:p270`      |
| Cry Havoc            | `hero_skill:weald:h17:p346`     | `hero_skill:weald:h17:p347`     | `hero_skill:weald:h17:p348`     |
| Lick Wounds          | `hero_skill:weald:h17:p352`     | `hero_skill:weald:h17:p353`     | `hero_skill:weald:h17:p354`     |
| Patch Up             | `hero_skill:musketeer:h18:p373` | `hero_skill:musketeer:h18:p374` | `hero_skill:musketeer:h18:p375` |

## 6 组 增益、防护与自我支援（42 张）

| 技能                 | I                             | II                            | III                           |
| -------------------- | ----------------------------- | ----------------------------- | ----------------------------- |
| Bulwark of Faith     | `hero_skill:core:h01:p010`    | `hero_skill:core:h01:p011`    | `hero_skill:core:h01:p012`    |
| Adrenaline Rush      | `hero_skill:core:h02:p037`    | `hero_skill:core:h02:p038`    | `hero_skill:core:h02:p039`    |
| Battle Ballad        | `hero_skill:core:h06:p118`    | `hero_skill:core:h06:p119`    | `hero_skill:core:h06:p120`    |
| Emboldening Vapours  | `hero_skill:core:h07:p142`    | `hero_skill:core:h07:p143`    | `hero_skill:core:h07:p144`    |
| Shadow Fade          | `hero_skill:core:h09:p178`    | `hero_skill:core:h09:p179`    | `hero_skill:core:h09:p180`    |
| Toxin Trickery       | `hero_skill:core:h09:p187`    | `hero_skill:core:h09:p188`    | `hero_skill:core:h09:p189`    |
| Withstand            | `hero_skill:warrens:h14:p286` | `hero_skill:warrens:h14:p287` | `hero_skill:warrens:h14:p288` |
| Get Down!            | `hero_skill:warrens:h15:p301` | `hero_skill:warrens:h15:p302` | `hero_skill:warrens:h15:p303` |
| Invigorating Vapours | `hero_skill:warrens:h15:p310` | `hero_skill:warrens:h15:p311` | `hero_skill:warrens:h15:p312` |
| Protect Me           | `hero_skill:warrens:h15:p313` | `hero_skill:warrens:h15:p314` | `hero_skill:warrens:h15:p315` |
| Defender             | `hero_skill:cove:h12:p241`    | `hero_skill:cove:h12:p242`    | `hero_skill:cove:h12:p243`    |
| Command              | `hero_skill:cove:h12:p247`    | `hero_skill:cove:h12:p248`    | `hero_skill:cove:h12:p249`    |
| Serpent Sway         | `hero_skill:weald:h16:p334`   | `hero_skill:weald:h16:p335`   | `hero_skill:weald:h16:p336`   |
| Guard Dog            | `hero_skill:weald:h17:p349`   | `hero_skill:weald:h17:p350`   | `hero_skill:weald:h17:p351`   |

## 7 组 无直接伤害的控制与减益（36 张）

| 技能               | I                               | II                              | III                             |
| ------------------ | ------------------------------- | ------------------------------- | ------------------------------- |
| Barbaric YAWP!     | `hero_skill:core:h02:p028`      | `hero_skill:core:h02:p029`      | `hero_skill:core:h02:p030`      |
| Mark for Death     | `hero_skill:core:h03:p046`      | `hero_skill:core:h03:p047`      | `hero_skill:core:h03:p048`      |
| Flashbang          | `hero_skill:core:h03:p055`      | `hero_skill:core:h03:p056`      | `hero_skill:core:h03:p057`      |
| Solo               | `hero_skill:core:h06:p115`      | `hero_skill:core:h06:p116`      | `hero_skill:core:h06:p117`      |
| Blinding Gas       | `hero_skill:core:h07:p133`      | `hero_skill:core:h07:p134`      | `hero_skill:core:h07:p135`      |
| Disorienting Blast | `hero_skill:core:h07:p145`      | `hero_skill:core:h07:p146`      | `hero_skill:core:h07:p147`      |
| Sniper’s Mark      | `hero_skill:core:h08:p154`      | `hero_skill:core:h08:p155`      | `hero_skill:core:h08:p156`      |
| Revenge            | `hero_skill:warrens:h14:p283`   | `hero_skill:warrens:h14:p284`   | `hero_skill:warrens:h14:p285`   |
| Flashpowder        | `hero_skill:warrens:h15:p304`   | `hero_skill:warrens:h15:p305`   | `hero_skill:warrens:h15:p306`   |
| Bellow             | `hero_skill:cove:h12:p238`      | `hero_skill:cove:h12:p239`      | `hero_skill:cove:h12:p240`      |
| Target Whistle     | `hero_skill:weald:h17:p343`     | `hero_skill:weald:h17:p344`     | `hero_skill:weald:h17:p345`     |
| Call the Shot      | `hero_skill:musketeer:h18:p364` | `hero_skill:musketeer:h18:p365` | `hero_skill:musketeer:h18:p366` |

## 8 组 特殊结算（12 张）

| 技能               | I                               | II                              | III                             |
| ------------------ | ------------------------------- | ------------------------------- | ------------------------------- |
| Rallying Flare     | `hero_skill:core:h08:p166`      | `hero_skill:core:h08:p167`      | `hero_skill:core:h08:p168`      |
| Transform to Beast | `hero_skill:core:h11:p220`      | `hero_skill:core:h11:p221`      | `hero_skill:core:h11:p222`      |
| Suffer             | `hero_skill:cove:h13:p271`      | `hero_skill:cove:h13:p272`      | `hero_skill:cove:h13:p273`      |
| Skeet Shot         | `hero_skill:musketeer:h18:p376` | `hero_skill:musketeer:h18:p377` | `hero_skill:musketeer:h18:p378` |

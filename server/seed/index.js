const User = require('../models/User');
const { Community, Building, House, Resident, ParkingSpace, PropertyFee } = require('../models/Community');
const { RiderWallet } = require('../models/Finance');

async function seedDatabase() {
  try {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount === 0) {
      await User.create({
        username: 'admin',
        password: '123456',
        name: '系统管理员',
        phone: '13800000001',
        role: 'admin'
      });
      console.log('已创建管理员账户: admin / 123456');
    }

    const dispatcherCount = await User.countDocuments({ role: 'dispatcher' });
    if (dispatcherCount === 0) {
      await User.create({
        username: 'dispatcher',
        password: '123456',
        name: '张调度',
        phone: '13800000002',
        role: 'dispatcher'
      });
      console.log('已创建调度员账户: dispatcher / 123456');
    }

    const merchantCount = await User.countDocuments({ role: 'merchant' });
    if (merchantCount === 0) {
      const merchant = new User({
        username: 'merchant',
        password: '123456',
        name: '李商户',
        phone: '13800000003',
        role: 'merchant',
        companyName: '美味餐饮店',
        address: '北京市朝阳区建国路88号',
        location: { coordinates: [116.4551, 39.9049] },
        contactPerson: '李经理',
        industry: '餐饮',
        discountRate: 0.95
      });
      await merchant.save();
      console.log('已创建商户账户: merchant / 123456');
    }

    const riderCount = await User.countDocuments({ role: 'rider' });
    if (riderCount === 0) {
      const rider1 = new User({
        username: 'rider1',
        password: '123456',
        name: '王骑手',
        phone: '13800000011',
        role: 'rider',
        vehicleType: 'motorcycle',
        vehicleNumber: '京B12345',
        vehicleModel: '雅马哈摩托',
        licenseNumber: '110101199001011234',
        idCard: '110101199001011234',
        currentLocation: { coordinates: [116.4053, 39.9050] },
        maxLoad: 50,
        maxVolume: 0.3
      });
      await rider1.save();

      await RiderWallet.create({
        rider: rider1._id,
        balance: 0,
        totalEarnings: 0
      });

      const rider2 = new User({
        username: 'rider2',
        password: '123456',
        name: '刘骑手',
        phone: '13800000012',
        role: 'rider',
        vehicleType: 'van',
        vehicleNumber: '京A88888',
        vehicleModel: '金杯面包车',
        licenseNumber: '110101199202025678',
        idCard: '110101199202025678',
        currentLocation: { coordinates: [116.4153, 39.9150] },
        maxLoad: 500,
        maxVolume: 5.0
      });
      await rider2.save();

      await RiderWallet.create({
        rider: rider2._id,
        balance: 0,
        totalEarnings: 0
      });

      console.log('已创建骑手账户: rider1 / 123456, rider2 / 123456');
    }

    const communityCount = await Community.countDocuments();
    if (communityCount === 0) {
      const community = await Community.create({
        name: '阳光花园社区',
        address: '北京市海淀区中关村大街1号',
        location: { coordinates: [116.3160, 39.9786] },
        totalBuildings: 10,
        totalHouses: 500,
        totalResidents: 1200,
        propertyCompany: '阳光物业',
        contactPhone: '010-12345678',
        area: 50000,
        greeningRate: 35,
        buildYear: 2010
      });

      const building1 = await Building.create({
        community: community._id,
        buildingNo: '1号楼',
        totalFloors: 18,
        unitsPerFloor: 4,
        totalUnits: 72,
        buildingType: '高层住宅',
        elevators: 2
      });

      const resident1 = await Resident.create({
        name: '张三',
        phone: '13900000001',
        idCard: '110101198505051234',
        gender: 'male',
        relation: 'owner',
        community: community._id,
        status: 'active'
      });

      const house1 = await House.create({
        community: community._id,
        building: building1._id,
        unitNo: '2单元',
        roomNo: '1801',
        area: 120,
        houseType: '三室两厅',
        owner: resident1._id,
        residents: [resident1._id],
        status: 'owned'
      });

      resident1.house = house1._id;
      await resident1.save();

      await ParkingSpace.create({
        community: community._id,
        spaceNo: 'A-001',
        location: '地下一层A区',
        type: 'fixed',
        owner: resident1._id,
        carNumber: '京A12345',
        status: 'occupied'
      });

      await PropertyFee.create({
        feeNo: 'FY202401001',
        community: community._id,
        house: house1._id,
        resident: resident1._id,
        type: 'property',
        period: { year: 2024, month: 1 },
        area: 120,
        unitPrice: 2.5,
        amount: 300,
        status: 'unpaid',
        dueDate: new Date('2024-01-31')
      });

      console.log('已创建智慧社区示例数据');
    }

    console.log('数据库初始化完成');
  } catch (err) {
    console.error('数据库初始化失败:', err.message);
  }
}

module.exports = { seedDatabase };

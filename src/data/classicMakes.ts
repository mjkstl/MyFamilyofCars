/**
 * Fallback Make list, used when the EPA list is not available:
 * cars older than 1984 (EPA coverage starts there), no Year picked yet,
 * or the EPA service could not be reached.
 *
 * Car brands sold in the US across the 20th and 21st centuries, current
 * and defunct. Not exhaustive on purpose — the picker always offers
 * "Not listed? Type it", which keeps the full NHTSA search available.
 */
export const CLASSIC_MAKES: readonly string[] = [
  'Acura', 'Alfa Romeo', 'AMC', 'Aston Martin', 'Audi', 'Austin-Healey',
  'Bentley', 'BMW', 'Buick', 'Cadillac', 'Checker', 'Chevrolet', 'Chrysler',
  'Daewoo', 'Datsun', 'DeLorean', 'DeSoto', 'Dodge', 'Eagle', 'Edsel',
  'Ferrari', 'Fiat', 'Fisker', 'Ford', 'Genesis', 'Geo', 'GMC', 'Honda',
  'Hudson', 'Hummer', 'Hyundai', 'Infiniti', 'International Harvester',
  'Isuzu', 'Jaguar', 'Jeep', 'Kaiser', 'Kia', 'Lamborghini', 'Land Rover',
  'Lexus', 'Lincoln', 'Lotus', 'Lucid', 'Maserati', 'Mazda', 'McLaren',
  'Mercedes-Benz', 'Mercury', 'MG', 'Mini', 'Mitsubishi', 'Nash', 'Nissan',
  'Oldsmobile', 'Opel', 'Packard', 'Peugeot', 'Plymouth', 'Polestar',
  'Pontiac', 'Porsche', 'Ram', 'Rambler', 'Renault', 'Rivian', 'Rolls-Royce',
  'Saab', 'Saturn', 'Scion', 'Smart', 'Studebaker', 'Subaru', 'Suzuki',
  'Tesla', 'Toyota', 'Triumph', 'Volkswagen', 'Volvo', 'Willys', 'Yugo',
];

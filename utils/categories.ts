import { IconType } from 'react-icons';
import { MdCabin } from 'react-icons/md';

import { TbCaravan, TbTent, TbBuildingCottage } from 'react-icons/tb';

import { GiWoodCabin, GiTreehouse } from 'react-icons/gi';
import { PiLighthouse, PiVan } from 'react-icons/pi';
import { TbBuilding } from 'react-icons/tb';

import { GoContainer } from 'react-icons/go';

type Category = {
  label: CategoryLabel;
  icon: IconType;
};

export type CategoryLabel =
  | 'cabin'
  | 'tent'
  | 'airstream'
  | 'cottage'
  | 'container'
  | 'caravan'
  | 'tiny'
  | 'treehouse'
  | 'barn'
  | 'lodge';

export const categories: Category[] = [
  {
    label: 'cabin',
    icon: MdCabin,
  },
  {
    label: 'airstream',
    icon: PiVan,
  },
  {
    label: 'tent',
    icon: TbTent,
  },
  {
    label: 'barn',
    icon: TbBuilding,
  },
  {
    label: 'cottage',
    icon: TbBuildingCottage,
  },
  {
    label: 'treehouse',
    icon: GiTreehouse,
  },
  {
    label: 'container',
    icon: GoContainer,
  },
  {
    label: 'caravan',
    icon: TbCaravan,
  },

  {
    label: 'tiny',
    icon: PiLighthouse,
  },
  {
    label: 'lodge',
    icon: GiWoodCabin,
  },
];
